# Anonymous API usage controls

The backend Vercel entry point requires a shared Upstash Redis store. Each
protected request sends one HTTPS REST command that uses Lua to check and
consume all applicable counters atomically. Every function instance must point
to the same Redis database and namespace. The limiter has no process-local
counter fallback. See [Upstash atomic Lua operations](https://upstash.com/blog/lua-scripting-on-upstash-redis-atomic-operations-over-http)
and the [Redis REST API](https://upstash.com/docs/redis/features/restapi).

## Backend configuration

| Scope | Request limit | Window |
| --- | --- | --- |
| Per-client generation shared by flashcards and quiz | `RATE_LIMIT_GENERATION_REQUESTS=6` | `RATE_LIMIT_GENERATION_WINDOW_SECONDS=600` |
| Per-client document upload | `RATE_LIMIT_UPLOAD_REQUESTS=8` | `RATE_LIMIT_UPLOAD_WINDOW_SECONDS=60` |
| Global generation across all clients | `RATE_LIMIT_GLOBAL_GENERATION_REQUESTS=100` | `RATE_LIMIT_GLOBAL_GENERATION_WINDOW_SECONDS=86400` |

These defaults are SmartCards request budgets. Confirm actual Groq quotas
and usage in the account dashboard. A 15-item request can consume more tokens
than a five-item request, and calls made elsewhere against the account are
outside these counters. Redis starts each fixed window on its first admitted
request. Requests near a reset can use the end of one window and the start
of the next. Admitted POSTs count even if input validation, extraction, or
generation later fails. Rejected requests consume neither budget. Health and
CORS preflights are exempt.

- `UPSTASH_REDIS_REST_URL` must be the HTTPS root URL for the Redis instance
  on `*.upstash.io`. Set a backend-only `UPSTASH_REDIS_REST_TOKEN` with
  permission to run the script and its counter commands. A read-only token
  is insufficient. A dedicated limiter database limits the credential's
  scope.
- `RATE_LIMIT_KEY_SECRET` is a stable, randomly generated backend-only HMAC
  secret of at least 32 bytes. Generate it with `openssl rand -hex 32`.
  `RATE_LIMIT_NAMESPACE` defaults to `smartcards` and accepts up to 40
  letters, digits, hyphens, or underscores. Share the same namespace, secret,
  and limits across instances and deployments that should share counters.
  Use independent counters and a separate provider budget for isolated
  previews. Rotating the HMAC secret resets existing client budgets.
- `AI_GENERATION_ENABLED=0` disables both generation routes and leaves
  uploads available. Use `1` to enable generation. Vercel environment updates
  require a new deployment before a change takes effect. In an active
  incident, an already approved edge block or provider-side key revocation
  can stop traffic while the setting takes effect.
  [Vercel environment variables](https://vercel.com/docs/environment-variables)
- Direct local Flask runs leave shared limiting off by default.
  `RATE_LIMIT_ENABLED=1` enables it with a valid store configuration.
  The Vercel entry point always requires it, including in preview.

## Identity, privacy, and failures

The Vercel entry point assumes the Flask function is reachable only through the
Vercel ingress that sets `X-Vercel-Forwarded-For`. It accepts one valid IP
from that header and ignores the generic `X-Forwarded-For` chain. Missing or
invalid trusted identity fails closed. Keep this entry point behind Vercel
and verify header replacement on every public hostname before enabling
traffic. Direct local Flask uses the transport peer address.
[Vercel request headers](https://vercel.com/docs/headers/request-headers)

IPv4 addresses and IPv6 /64 prefixes are keyed using HMAC-SHA256. Redis
stores expiring pseudonymous counter keys and integers. Store requests
contain no files, prompts, answers, or raw IP addresses. The Redis credential
is sent only in the backend HTTPS authorization header. The application uses
a two-second HTTP client timeout for the limiter, with no retry or redirect.

An application rejection returns HTTP 429 with
`{"error":"SmartCards request limit reached. Try again later.","code":"rate_limited"}`
and a `Retry-After` in seconds for the longest exhausted window. Groq 429s
retain the provider error message and code. A missing, invalid, or unavailable
store or trusted identity returns JSON HTTP 503 with
`usage_control_unavailable`. The generation switch returns HTTP 503 with
`generation_disabled`.

## Before enabling public traffic

1. Confirm a suitable Upstash plan, command allowance, and a writable REST
   credential. Redis quotas and outages affect API availability. Configure the
   shared store before deploying the backend; without it protected POSTs
   fail closed. Keep all tokens and secrets off the frontend.
2. Set `AI_PROVIDER=groq`, `AI_MODEL=openai/gpt-oss-20b`, and backend-only
   `GROQ_API_KEY`. Verify Groq account quota and configure provider-side
   quota or spending ceilings and usage alerts where available. Keep billing
   disabled for this deployment. Monitor store usage, API 429/503 responses,
   and Groq usage. Confirm preview or other applications cannot consume the
   same provider quota outside the shared budget.
3. In an authorized Vercel preview, verify both generation routes share one
   counter across instances or deployments, uploads have their own counter,
   spoofed headers cannot change the budget, and the advertised reset works.
   Confirm CORS, health, fail-closed behavior, and the generation switch.
   Use synthetic data and avoid invoking Groq to test limiter bursts.
4. Review edge controls for volumetric traffic. Each protected POST still uses
   a function invocation and a Redis command. Rotating IPs can defeat the
   per-client limits, while NAT users can share a budget. Distributed clients
   can exhaust the global generation allowance or attack uploads. The global
   request budget is a ceiling on admissions, with no distributed concurrency
   or token-based limit. Retain the existing body limits and provider timeout;
   request budgets do not bound document-parser resource use per upload.

Offline tests use two Flask apps with a single mocked shared store. A real
Upstash database and Vercel ingress have yet to be verified. The original
prompts remain active. The revised prompt evaluation failures remain unresolved.
