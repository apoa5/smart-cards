from io import BytesIO
import os
import unittest
from unittest.mock import patch

import httpx

from app import create_app
from app.ai_errors import GenerationError
from app.rate_limit import _CONSUME


ENV = {
    "UPSTASH_REDIS_REST_URL": "https://test.upstash.io",
    "UPSTASH_REDIS_REST_TOKEN": "synthetic-token",
    "RATE_LIMIT_KEY_SECRET": "synthetic-secret-longer-than-32-bytes",
    "RATE_LIMIT_GENERATION_REQUESTS": "2",
    "RATE_LIMIT_GENERATION_WINDOW_SECONDS": "10",
    "RATE_LIMIT_UPLOAD_REQUESTS": "1",
    "RATE_LIMIT_UPLOAD_WINDOW_SECONDS": "5",
    "RATE_LIMIT_GLOBAL_GENERATION_REQUESTS": "4",
    "RATE_LIMIT_GLOBAL_GENERATION_WINDOW_SECONDS": "20",
}
CLIENT = "198.51.100.3"
OTHER_CLIENT = "198.51.100.4"
CARD = "/api/generate_flashcards"
QUIZ = "/api/generate_quiz"
ITEMS = [{"question": "Example?"}]


class SharedRedisFake:
    """Emulate the REST command and expiry using a deterministic server clock."""

    def __init__(self):
        self.now_ms = 0
        self.counters = {}

    def post(self, url, *, headers, json, timeout, follow_redirects, trust_env):
        assert url == ENV["UPSTASH_REDIS_REST_URL"]
        assert headers == {"Authorization": "Bearer synthetic-token"}
        assert timeout == 2.0 and not follow_redirects and not trust_env
        command, script, size, *parameters = json
        assert command == "EVAL" and script == _CONSUME
        keys = parameters[:size]
        args = parameters[size:]
        assert len(args) == 2 * size
        budgets = list(zip(keys, args[::2], args[1::2]))
        for key, _, _ in budgets:
            if key in self.counters and self.counters[key][1] <= self.now_ms:
                del self.counters[key]
        retry_ms = max(
            (self.counters[key][1] - self.now_ms for key, limit, _ in budgets
             if key in self.counters and self.counters[key][0] >= limit),
            default=0,
        )
        if not retry_ms:
            for key, _, window in budgets:
                count, expiry = self.counters.get(key, (0, self.now_ms + window))
                self.counters[key] = (count + 1, expiry)
        return httpx.Response(200, json={"result": retry_ms}, request=httpx.Request("POST", url))


class RateLimitTests(unittest.TestCase):
    def setUp(self):
        self.redis = SharedRedisFake()
        self.rest = patch("app.rate_limit.httpx.post", side_effect=self.redis.post)
        self.rest_mock = self.rest.start()
        self.addCleanup(self.rest.stop)
        for name in ("generate_flashcards", "generate_quiz_questions"):
            patcher = patch(f"app.routes.{name}", return_value=ITEMS)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)
        self.client = self.make_client()
        self.second_instance = self.make_client()

    def make_client(self, *, on_vercel=True, **settings):
        with patch.dict(os.environ, {**ENV, **settings}, clear=True):
            return create_app(on_vercel=on_vercel).test_client()

    @staticmethod
    def generate(client, route=CARD, ip=CLIENT, **headers):
        return client.post(route, json={"text": "Example notes"}, headers={
            "X-Vercel-Forwarded-For": ip, "Origin": "http://localhost:5173", **headers,
        })

    @staticmethod
    def upload(client, ip=CLIENT):
        return client.post("/api/upload", headers={"X-Vercel-Forwarded-For": ip},
                           data={"file": (BytesIO(b"Example notes"), "notes.txt")})

    def test_generation_budget_is_shared_across_routes_and_instances(self):
        self.assertEqual(self.generate(self.client).json, {"flashcards": ITEMS})
        self.assertEqual(self.generate(self.second_instance, QUIZ).json, {"quiz": ITEMS})
        response = self.generate(self.second_instance, **{"X-Forwarded-For": OTHER_CLIENT})
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json, {
            "error": "SmartCards request limit reached. Try again later.", "code": "rate_limited",
        })
        self.assertEqual(response.headers["Retry-After"], "10")
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://localhost:5173")
        self.generate_flashcards.assert_called_once()
        self.generate_quiz_questions.assert_called_once()
        sent = repr(self.rest_mock.call_args.kwargs["json"])
        self.assertNotIn(CLIENT, sent)
        self.assertNotIn("Example notes", sent)
        self.assertNotIn("synthetic-secret", sent)

    def test_clients_and_uploads_have_independent_budgets_and_reset(self):
        self.assertEqual(self.upload(self.client).json, {"preview": "Example notes", "word_count": 2})
        self.assertEqual(self.upload(self.second_instance).headers["Retry-After"], "5")
        self.assertEqual(self.upload(self.client, OTHER_CLIENT).status_code, 200)
        self.assertEqual(self.generate(self.client).status_code, 200)
        self.assertEqual(self.generate(self.client, QUIZ).status_code, 200)
        self.assertEqual(self.generate(self.second_instance, ip=OTHER_CLIENT).status_code, 200)

        self.redis.now_ms = 4_999
        self.assertEqual(self.upload(self.client).headers["Retry-After"], "1")
        self.redis.now_ms = 5_000
        self.assertEqual(self.upload(self.client).status_code, 200)
        self.redis.now_ms = 9_999
        self.assertEqual(self.generate(self.second_instance).headers["Retry-After"], "1")
        self.redis.now_ms = 10_000
        self.assertEqual(self.generate(self.second_instance).status_code, 200)

    def test_global_budget_limits_distinct_clients_without_blocking_upload(self):
        for ip in ("198.51.100.10", "198.51.100.11", "198.51.100.12", "198.51.100.13"):
            self.assertEqual(self.generate(self.client, ip=ip).status_code, 200)
        response = self.generate(self.second_instance, QUIZ, ip=OTHER_CLIENT)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["Retry-After"], "20")
        self.generate_quiz_questions.assert_not_called()
        self.assertEqual(self.upload(self.second_instance).status_code, 200)
        self.redis.now_ms = 20_000
        self.assertEqual(self.generate(self.second_instance, QUIZ, ip=OTHER_CLIENT).status_code, 200)

    def test_ip_header_is_required_and_ipv6_prefixes_share_a_budget(self):
        for address in ("", "198.51.100.1, 198.51.100.2", "invalid"):
            response = self.generate(self.client, ip=address, **{"X-Forwarded-For": CLIENT})
            self.assertEqual(response.status_code, 503)
        self.rest_mock.assert_not_called()
        self.assertEqual(self.generate(self.client, ip="2001:db8::1").status_code, 200)
        self.assertEqual(self.generate(self.client, ip="2001:db8::2").status_code, 200)
        self.assertEqual(self.generate(self.second_instance, ip="2001:db8::3").status_code, 429)
        self.assertEqual(self.generate(self.second_instance, ip="2001:db8:0:1::1").status_code, 200)

    def test_non_vercel_uses_peer_address_and_ignores_forwarding_headers(self):
        client = self.make_client(on_vercel=False, RATE_LIMIT_ENABLED="1")
        self.assertEqual(self.generate(client, ip=CLIENT).status_code, 200)
        self.assertEqual(self.generate(client, ip=OTHER_CLIENT).status_code, 200)
        self.assertEqual(self.generate(client, ip="198.51.100.10").status_code, 429)

    def test_missing_or_failing_store_fails_closed_on_vercel(self):
        misconfigured = self.make_client(UPSTASH_REDIS_REST_TOKEN="", RATE_LIMIT_ENABLED="0")
        response = self.generate(misconfigured)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["code"], "usage_control_unavailable")
        self.assertEqual(misconfigured.get("/api/health").status_code, 200)
        self.assertEqual(misconfigured.options(QUIZ).status_code, 200)
        self.rest_mock.assert_not_called()

        self.rest_mock.side_effect = httpx.ConnectError("sensitive upstream detail")
        response = self.upload(self.client)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json, {
            "code": "usage_control_unavailable", "error": "API usage controls are temporarily unavailable.",
        })
        self.rest_mock.assert_called_once()
        self.generate_flashcards.assert_not_called()

    def test_generation_kill_switch_leaves_upload_available(self):
        client = self.make_client(AI_GENERATION_ENABLED="0")
        response = self.generate(client)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["code"], "generation_disabled")
        self.rest_mock.assert_not_called()
        self.generate_flashcards.assert_not_called()
        self.assertEqual(self.upload(client).status_code, 200)

    def test_provider_rate_limit_keeps_existing_error_envelope(self):
        self.generate_flashcards.side_effect = GenerationError("rate_limited", "AI service is busy.", 429)
        response = self.generate(self.client)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json, {"error": "AI service is busy.", "code": "rate_limited"})
        self.assertNotIn("Retry-After", response.headers)
