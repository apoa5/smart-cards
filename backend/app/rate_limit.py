"""Shared request budgets for the public API."""

import hashlib
import hmac
from ipaddress import IPv4Address, IPv6Address, ip_address, ip_network
import os
import re

import httpx
from flask import jsonify, request


# Check all budgets before consuming any of them. Redis owns the window clocks.
_CONSUME = """
local retry_ms = 0
for i, key in ipairs(KEYS) do
    local count = redis.call('GET', key)
    if count then
        local ttl = redis.call('PTTL', key)
        if ttl < 0 then
            return redis.error_reply('Invalid budget expiration')
        end
        if tonumber(count) >= tonumber(ARGV[2 * i - 1]) then
            retry_ms = math.max(retry_ms, ttl, 1)
        end
    end
end
if retry_ms > 0 then
    return retry_ms
end
for i, key in ipairs(KEYS) do
    if not redis.call('SET', key, 1, 'PX', ARGV[2 * i], 'NX') then
        redis.call('INCR', key)
    end
end
return 0
"""

_GENERATION_ENDPOINTS = {"main.flashcard_route", "main.quiz_route"}


class BudgetUnavailable(Exception):
    """A protected request cannot be admitted safely."""


class UpstashBudgets:
    def __init__(self, url, token):
        self._url = url
        self._token = token

    def consume(self, budgets):
        keys = [key for key, _, _ in budgets]
        args = [value for _, limit, seconds in budgets for value in (limit, seconds * 1_000)]
        try:
            response = httpx.post(
                self._url,
                headers={"Authorization": f"Bearer {self._token}"},
                json=["EVAL", _CONSUME, len(keys), *keys, *args],
                timeout=2.0,
                follow_redirects=False,
                trust_env=False,
            )
            response.raise_for_status()
            result = response.json()["result"]
            if type(result) is not int or result < 0:
                raise ValueError("Invalid budget result")
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            raise BudgetUnavailable from None
        return (result + 999) // 1_000


def _client_identity(on_vercel):
    address = request.headers.get("X-Vercel-Forwarded-For") if on_vercel else request.remote_addr
    if not address or "%" in address:
        raise BudgetUnavailable
    try:
        ip = ip_address(address.strip())
    except ValueError:
        raise BudgetUnavailable from None
    if isinstance(ip, IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    if isinstance(ip, IPv4Address):
        return str(ip)
    return str(ip_network((ip, 64), strict=False))


def _positive_setting(name, default):
    value = int(os.getenv(name, str(default)))
    if not 1 <= value <= 2_147_483_647:
        raise ValueError("Rate limit settings must be positive integers")
    return value


def install_usage_controls(app, *, on_vercel):
    enabled = on_vercel or os.getenv("RATE_LIMIT_ENABLED", "").strip() == "1"
    generation_enabled = os.getenv("AI_GENERATION_ENABLED", "1").strip() == "1"
    store = None
    if enabled:
        try:
            url = os.getenv("UPSTASH_REDIS_REST_URL", "").strip()
            token = os.getenv("UPSTASH_REDIS_REST_TOKEN", "").strip()
            secret = os.getenv("RATE_LIMIT_KEY_SECRET", "").strip().encode()
            namespace = os.getenv("RATE_LIMIT_NAMESPACE", "smartcards").strip()
            if not re.fullmatch(r"https://[a-zA-Z0-9-]+\.upstash\.io/?", url):
                raise ValueError("Invalid Redis REST endpoint")
            if not token or len(secret) < 32 or not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", namespace):
                raise ValueError("Invalid limiter credentials or namespace")
            generation = (
                _positive_setting("RATE_LIMIT_GENERATION_REQUESTS", 6),
                _positive_setting("RATE_LIMIT_GENERATION_WINDOW_SECONDS", 600),
            )
            upload = (
                _positive_setting("RATE_LIMIT_UPLOAD_REQUESTS", 8),
                _positive_setting("RATE_LIMIT_UPLOAD_WINDOW_SECONDS", 60),
            )
            global_generation = (
                _positive_setting("RATE_LIMIT_GLOBAL_GENERATION_REQUESTS", 100),
                _positive_setting("RATE_LIMIT_GLOBAL_GENERATION_WINDOW_SECONDS", 86_400),
            )
            store = UpstashBudgets(url, token)
        except ValueError:
            app.logger.warning("Shared API rate limiter is misconfigured")

    @app.before_request
    def enforce_usage_controls():
        if request.method != "POST":
            return None
        is_generation = request.endpoint in _GENERATION_ENDPOINTS
        if not is_generation and request.endpoint != "main.upload_file":
            return None
        if is_generation and not generation_enabled:
            return jsonify(error="Study generation is temporarily disabled.", code="generation_disabled"), 503
        if not enabled:
            return None

        try:
            if store is None:
                raise BudgetUnavailable
            identity = _client_identity(on_vercel)
            fingerprint = hmac.new(secret, identity.encode(), hashlib.sha256).hexdigest()
            if is_generation:
                prefix = f"{{{namespace}:generation}}"
                budgets = [(f"{prefix}:client:{fingerprint}", *generation),
                           (f"{prefix}:global", *global_generation)]
            else:
                budgets = [(f"{{{namespace}:upload}}:client:{fingerprint}", *upload)]
            retry_after = store.consume(budgets)
        except BudgetUnavailable:
            return jsonify(error="API usage controls are temporarily unavailable.",
                           code="usage_control_unavailable"), 503

        if retry_after:
            return (
                jsonify(error="SmartCards request limit reached. Try again later.", code="rate_limited"),
                429,
                {"Retry-After": str(retry_after)},
            )
        return None
