# SmartCards release checklist

This checklist records prerequisites for a later preview or release. Cloud
configuration, public traffic, and deployment verification remain pending.

## Prepare the release candidate

- [ ] Review the dependency pins and match the tested Python and Node runtimes.
  Confirm the selected Vercel Python runtime before the preview.
- [ ] Run the offline backend suite, frontend tests, lint, build, and diff
  checks from the candidate revision. Record the commit and tool versions.
- [ ] Confirm the active prompts are the original version. Review the
  [Groq evaluation results](../evaluation/README.md), including grounding
  gaps and the unresolved revised-prompt failures.

## Verify an authorized preview

- [ ] Use separate Vercel projects rooted at `frontend/` and `backend/`.
  Set the exact frontend CORS origin and frontend API base URL.
- [ ] Configure backend-only `AI_PROVIDER=groq`,
  `AI_MODEL=openai/gpt-oss-20b`, and `GROQ_API_KEY`. Confirm model access,
  available quota, and account usage controls. Check provider data settings.
- [ ] Configure a writable shared Upstash store, HMAC key secret, and
  consistent namespace and budgets. Verify trusted client identity and
  fail-closed behavior using the
  [API usage-controls checklist](API_USAGE_CONTROLS.md#before-enabling-public-traffic).
- [ ] Verify direct dashboard loads and refreshes. Exercise supported
  uploads, invalid and oversized files, and both study modes on the
  preview. Use synthetic notes and preapproved, bounded inference calls.
- [ ] Check keyboard focus, screen-reader announcements, narrow mobile
  layouts, native dialogs, rate-limit guidance, and network error recovery.
- [ ] Confirm the function has sufficient time for Redis, the provider call,
  and request processing within the platform's limits. Confirm both app
  and Vercel payload limits behave as documented. [Vercel Functions limits](https://vercel.com/docs/functions/limitations).
- [ ] Verify that no secret is present in the client bundle, URLs, error
  responses, or logs. Check alerting for Redis failures, application 429s,
  and Groq quota or throttling events.

## Rollback preparation

- [ ] Record the last approved frontend and backend deployment IDs and
  their compatible backend environment settings. Verify the rollback target
  still enforces shared usage controls before directing public traffic to it.
- [ ] Document who can pause inference, how to apply
  `AI_GENERATION_ENABLED=0` in a new deployment, and how to confirm the
  expected 503 response. Preserve upload limits during rollback.
- [ ] Obtain release approval before changing production traffic. Record
  preview evidence, unresolved issues, the rollback target, and ownership.
