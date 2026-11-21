# SmartCards Refactoring Plan — Codex Reference

**Repository:** https://github.com/apoa5/smart-cards  
**Baseline:** `main`, inspected 2026-11-21 (re-check commit SHA locally before work)  
**Status:** Planning only; no application code changed.  
**Primary goal:** Make SmartCards immediately usable without accounts, retain document-to-flashcard/quiz functionality, and migrate from hardcoded OpenAI inference to a validated, provider-independent service that can use hosted open-weight models.

## 0. Instructions for Codex (read before every step)

- Treat this file as the implementation reference. Work **only on the named step** in the current prompt. Never silently proceed to subsequent steps.
- Inspect the real repository at the beginning of each step; this plan reflects a snapshot and paths may change. If files differ, describe differences and adapt conservatively.
- Preserve existing successful behavior unless the step explicitly changes it. Small, focused diffs; no unrelated redesign or dependency upgrade.
- Do not push, force-push, delete branches, deploy, create accounts, provision paid cloud resources, or commit without the user's explicit request. Suggest one Conventional Commit message after each step.
- Always report: files changed, rationale, verification commands and results, remaining risks, and any decisions requiring human approval. If tests cannot run, say so; do not claim success.
- Never print credentials, document contents, full provider responses with user data, or secrets in logs. Never put a provider key in a `VITE_` variable.
- Favor mock-based tests; provider network tests should be opt-in, bounded, and cost-aware. Never send actual private study material to a provider for testing.
- A **public application is not an unlimited public inference API**. Protect costly routes at the server/edge independently of the browser, without reintroducing user login.
- Stop and report any backward-incompatible API, billing, privacy, license, or infrastructure decision rather than guessing.
- Definition of done for a step: acceptance criteria met, tests documented, code reviewable, and no unintended behavior changes.

## 1. Audited current state

### Stack and flow
- `frontend/`: React 19 + Vite + Tailwind + React Router 7 + Axios; deployed separately on Vercel.
- `backend/`: Flask, Flask-CORS; API entry `backend/api/index.py`; separately deployed on Vercel.
- Auth in `frontend/src/context/AuthContext.jsx`, `frontend/src/supabaseClient.jsx`, `frontend/src/components/PrivateRoute.jsx`, `frontend/src/components/PublicRoute.jsx`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Signup.jsx`, `frontend/src/App.jsx`, `frontend/src/pages/Dashboard.jsx`, and landing-page CTA(s). `@supabase/supabase-js` in `frontend/package.json`.
- Main flow in `frontend/src/components/FileUploader.jsx`: POST `/api/upload`, then POST `/api/generate_flashcards` or `/api/generate_quiz`, each with `text` and `count` (5/10/15); results rendered by `FlashcardList.jsx` and `QuizList.jsx`.
- API routes in `backend/app/routes.py`; extraction in `backend/app/utils/utils.py`; preprocessing in `backend/app/utils/preprocess_text.py`.
- Generation in `backend/app/ai.py`: OpenAI SDK, hardcoded `gpt-3.5-turbo`, duplicate prompt/parse logic, JSON parsing with code-fence stripping, 40-second timeout and provider-specific errors.
- Supported upload: TXT, PDF, DOCX, PPTX; 4,000,000-byte file cap; Flask request size 4,100,000 bytes; extracted text trimmed to 2,000 words. Legacy DOC/PPT rejected.
- Existing backend tests: `backend/tests/test_api.py` and `backend/tests/test_generation_errors.py`; frontend scripts currently have lint/build but no test runner.
- `frontend/.env.example` and README require Supabase variables; `backend/.env.example` requires `OPENAI_API_KEY` and `CORS_ORIGINS`.
- Current deployment notes specify separate Vercel frontend and Flask backend, including origins and size constraints.

### Risks and opportunities
1. Authentication is frontend-only; generation endpoints already do not verify Supabase sessions. Remove frontend gating without touching backend auth (none found in inspected routes).
2. Provider access and duplicated logic are coupled to `backend/app/ai.py`; extract contracts before switching providers.
3. JSON parsing alone does **not** validate exact item count, flashcard fields, four distinct quiz options, or membership of `correct_answer` in options.
4. `request.get_json()` may return None or reject malformed input; API must enforce safe request shape, counts, bounded text, and consistent error codes. The 2,000-word extraction cap can be bypassed via direct generation requests.
5. Removing login eliminates a friction point but enables public cost abuse; CORS is **not** an abuse-control mechanism.
6. The landing page claims tracking progress, spaced repetition, and identifying weak spots; do not imply those features exist unless implemented. Scope them out of this refactor.
7. `preprocess_text` collapses whitespace before line-based deduplication, making `remove_repeated_lines` less useful; investigate with regression tests before changing it.
8. Files ending in `.pyc` are currently tracked under `backend/app/__pycache__`; clean tracked generated artifacts and update `.gitignore` in a separate hygiene step.
9. Uploads currently send extracted text to the browser and back to generation routes; keep contract for initial migration, consider future server-side short-lived storage only if justified (and privacy-reviewed).
10. Provider keys must stay server-side and quotas/cost ceilings must be configured before public launch.

## 2. Target scope and non-goals

**In scope**
- Immediately usable public landing-to-dashboard journey, no login, signup, sessions, logout UI or Supabase packages/config/docs.
- Existing flashcard/quiz UI (including focus mode), 5/10/15 counts, four upload formats, accessible loading/error states.
- Document and generation APIs with robust validation, safe limits and error semantics.
- Provider abstraction with configurable backend model, endpoint, credential, timeouts, schema validation and provider-specific adapters as needed.
- Hosted open-weight inference evaluated on real quality criteria before cutover; optional local Ollama adapter for development only.
- Server-side/edge abuse controls, privacy-safe logs, automated tests, docs, and staged deployment.

**Out of scope unless explicitly approved**
- Accounts, database, server-side study history, paid tiers, OCR, persistent uploaded documents, progress dashboards, spaced-repetition scheduling, broad UI redesign, asynchronous job queue, switching frontend/backend frameworks.

**Product decisions**
- Default routing: `/` remains marketing landing; CTA goes directly to `/dashboard`, and `/dashboard` is public. No auth state needed. Add a direct-study CTA with clear language.
- Anonymous session means no stored account or learning history; study content is transient in the browser, subject to normal page refresh behavior.
- Maintain current JSON response envelopes: `{ "flashcards": [...] }`, `{ "quiz": [...] }`, `{ "preview": "...", "word_count": N }`, and `{ "error": "...", "code": "..." }` for failures where applicable.
- Start with existing Vercel split deployment; only migrate hosting if performance, network or security constraints require it.

## 3. Model strategy / selection gate

**Preferred direction:** use hosted inference for an **open-weight** model first; do not assume an open-weight model is cost-free, fully open-source under every definition, or suitable for self-hosting. Keep Ollama as optional local benchmarking tool, not a Vercel deployment dependency.

**Candidates to evaluate, not hardcoded commitments:** a structured-output-capable GPT-OSS 20B deployment and at least one competitive hosted open-weight instruction model from providers such as Groq, Hugging Face Inference Providers, or another OpenAI-compatible host. Verify exact model availability, JSON schema support, context window, Ghana availability where relevant, pricing, free-tier limits, licensing, retention policies, and rate limits at implementation time. A selected model must be supported by a provider *today*; model availability changes.

**Baseline:** present-day generation behavior (mocked contract and, if access/credits permit, a small consented set of API runs). Avoid treating `gpt-3.5-turbo` as a viable permanent fallback without verifying its current status.

**Evaluation dataset:** Create 12–20 synthetic or openly licensed study passages across short/long input, STEM/humanities, tables/formatting, ambiguous material, and no-content cases. Test flashcards/quiz at 5, 10, 15 items. Use rubric: valid JSON/schema and count (hard gate, aim >=99% after bounded repair), answer groundedness (aim >=90% judged sample), sensible difficulty/coverage, unique questions/options, median/p95 latency, error rate, and estimated cost per request. Record actual results and environment details. Do not claim scores without measurements. Stop/go criteria: reliability and security gates must pass; pick lowest practical cost among acceptable quality/latency options. If no open-weight candidate passes, keep a configurable hosted fallback or delay migration rather than compromising product quality.

**Proposed config (final exact names can vary):** `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, `AI_API_KEY` or provider-specific secret, `AI_TIMEOUT_SECONDS`, `AI_MAX_OUTPUT_TOKENS`; never front-end variables. Ensure URL cannot be supplied by an end user (avoid SSRF). Use `OPENAI_API_KEY` only in the legacy adapter during migration; remove from final docs when unused.

## 4. Implementation phases and Codex prompts

### Step 01 — Reproduce and document baseline (NO feature changes)
**Goal:** Establish a reproducible safety net before any deletions.
**Inspect:** README, both manifests, Flask routes, generation code, frontend routing/uploader/renderers and tests.
**Tasks:** Confirm current behavior and actual package versions, run baseline `npm ci`, `npm run lint`, `npm run build`, and backend test suite (`cd backend && python -m unittest discover -s tests -v` or current supported equivalent). Record failures without hiding them. Map auth references and all request/response shapes. Create `docs/refactor/BASELINE.md` with tested commands and feature matrix; no secrets or generated binaries.
**Acceptance:** Actual baseline and known failures recorded, no product behavior changed.
**Codex prompt:**
> Read `SMARTCARDS_REFACTOR_PLAN.md`, implement **Step 01 only**. Inspect the actual code, produce `docs/refactor/BASELINE.md` with dependency, auth, API, feature, deployment, and test inventory. Run available frontend lint/build and backend tests, record exact outcomes, and do not change product behavior. Summarize issues and propose one Conventional Commit message. Do not commit or push.

### Step 02 — Add regression tests before refactor
**Goal:** Protect contracts independently of external provider access.
**Tasks:** Expand Flask API tests for health/upload formats, size limits, missing/malformed generation bodies, error envelopes, CORS, count choices and provider failure (using mocks). Add minimal frontend test setup (Vitest + React Testing Library if appropriate), testing landing CTA, public navigation, upload states and mock-generated flashcards/quizzes. Fixtures must be synthetic. Current incorrect behavior may be captured as failing tests with a documented intended contract; make clear whether tests are baseline characterization or new desired behavior.
**Acceptance:** Tests run offline, are deterministic, and clearly distinguish existing bugs from regressions; baseline remains green except explicitly documented expectation tests.
**Codex prompt:**
> Read plan, perform **Step 02 only**. Add deterministic baseline/regression tests around existing Flask API and React flows, with provider/API calls mocked. Use synthetic fixtures. Record any presently failing desired-behavior tests separately instead of secretly changing production code. Run test/lint/build commands; summarize results and commit suggestion. Do not commit or push.

### Step 03 — Make the study area fully public
**Goal:** No sign-in required; preserve actual study UI.
**Tasks:** In `frontend/src/App.jsx` remove `AuthProvider`, guarded routes and `/login`/`/signup`; map public `/dashboard` directly. Remove `AuthContext.jsx`, `supabaseClient.jsx`, `PrivateRoute.jsx`, `PublicRoute.jsx`, `Login.jsx`, `Signup.jsx` and any dead imports. In `Dashboard.jsx` remove user badge, logout control, modal and navigation code. Change all relevant `LandingPage.jsx` CTAs to `/dashboard`; replace stale copy. Decide on fallback route intentionally. Preserve file/flashcard/quiz components.
**Acceptance:** Fresh visitor can go directly to `/dashboard`; CTAs work; no auth screens or account requests; frontend tests and build pass.
**Codex prompt:**
> Read plan, implement **Step 03 only**: remove every Supabase-dependent auth page/context/route guard, make `/dashboard` public, update landing CTAs, remove logout/user UI, and preserve upload/generation/study UX. Search for dangling auth references. Update focused navigation tests, run lint/build/tests, provide summary and a Conventional Commit suggestion. Do not commit or push.

### Step 04 — Remove Supabase dependency, environment settings, and auth documentation
**Goal:** Complete removal, not just hidden screens.
**Tasks:** Run `npm uninstall @supabase/supabase-js` within frontend and update lockfile; remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `frontend/.env.example`, README files and deployment instructions. Search all tracked source for `supabase`, `auth`, `login`, `signup`, `logout` and distinguish legitimate generic references. Confirm no Supabase SDK in dependency tree; remove old environment variables manually from Vercel via deployment checklist (Codex must not change cloud config without approval). Do not delete a live Supabase project or users: separate owner decision after assessing data retention.
**Acceptance:** Clean build without Supabase env vars/package, no remaining auth UX or misleading docs.
**Codex prompt:**
> Read plan, implement **Step 04 only**. Remove Supabase from frontend package/lockfile, example env and relevant documentation. Search for residual references and verify install/build with Supabase variables absent. Produce a list of Vercel environment variables and Supabase-side resources that I should review manually; do not delete cloud resources or deploy. Report tests and commit message; do not commit/push.

### Step 05 — Harden the anonymous API before provider migration
**Goal:** Explicit bounded input, upload protection and stable error responses.
**Tasks:** Validate `request.is_json`, JSON object body, nonblank string text, maximum raw character/word/token-equivalent budget compatible with current 2,000-word policy, `count` as integer (not bool) in {5,10,15}; reject oversized JSON and wrong MIME with 400/413/415 as appropriate. Set MAX_CONTENT_LENGTH consciously with multipart overhead. Enforce server-side format/size validation and safe parsing errors. Preserve response envelope and current browser flows. Consider parser resource limits / archive bombs / file magic checks; implement practical controls without introducing persistence. Avoid logging uploaded content. Add tests for missing JSON, arrays, null, huge input, count 0/100/'15'/True and invalid files.
**Acceptance:** Direct API callers cannot bypass defined limits; no uncaught 500 for invalid input; regressions pass.
**Codex prompt:**
> Read plan, implement **Step 05 only**: harden `/api/upload`, `/api/generate_flashcards` and `/api/generate_quiz` for malformed/missing JSON, bounded text, valid item counts, file formats/sizes, safe errors and privacy-aware logging. Add targeted negative tests and preserve successful response contracts. Do not change AI provider yet. Run tests/lint/build; report and suggest commit message. Do not commit/push.

### Step 06 — Define schemas and validate model outputs
**Goal:** Model-provider independence and trustworthy UI data.
**Tasks:** Add Pydantic (or equally clear Python validation) schemas for `Flashcard` (`question`, `answer`) and `QuizQuestion` (`question`, `options` exactly four distinct nonempty strings, `correct_answer` exactly one member of options); validate list count matches requested count. Handle harmless whitespace normalization, duplicate questions, missing/extra fields, and provider malformed JSON with stable errors. Do not silently invent facts or change incorrect answers. Prefer schema-constrained output where supported but ALWAYS server-validate. Add exhaustive unit tests, including JSON code fences/truncation/wrong type/count.
**Acceptance:** Bad provider output never reaches UI as a successful response; valid legacy outputs still render.
**Codex prompt:**
> Read plan, implement **Step 06 only**. Introduce explicit flashcard and quiz output schemas/validators, exact count and question/answer/option invariants, and clear invalid-AI-response errors. Keep endpoint responses compatible. Test valid, malformed, duplicate, missing, incomplete and truncated results with no live model calls. Do not migrate providers yet. Run verification and suggest commit; do not commit/push.

### Step 07 — Extract a small AI provider interface
**Goal:** Separate Flask endpoint logic from model vendors.
**Tasks:** Refactor `backend/app/ai.py` into maintainable generation service, prompts/schema helpers, and adapter(s) (suggested `backend/app/ai/` package, but avoid module-vs-package conflict: move/remove old `ai.py` correctly). Provide a simple `generate_structured` or generation contract, a configurable `OpenAICompatibleProvider` where appropriate, and injectable fake provider for tests. Move error mapping to provider-neutral codes while preserving API status codes. Retain existing OpenAI integration temporarily to prove no behavioral regression; use dependency injection or app config, not hardcoded global clients. Avoid abstractions for hypothetical providers that are not being used.
**Acceptance:** Backend tests pass with mocked provider; model choice no longer hardcoded inside flashcard/quiz business logic.
**Codex prompt:**
> Read plan, implement **Step 07 only**. Separate prompts, generation service, provider adapter and error translation from Flask routes, with fake-provider test injection. Keep current OpenAI behavior as temporary implementation and preserve JSON contracts. Refactor in small files, remove duplication, avoid unrelated changes, and show verification. Do not commit/push; propose Conventional Commit.

### Step 08 — Prototype hosted open-weight inference (NOT production cutover)
**Goal:** Verify candidate support, structured responses, privacy and usable latency.
**Tasks:** Review current official provider docs, model licensing/availability and costs; select at least two available candidates. Add adapter configuration for a hosted, OpenAI-compatible endpoint using server-side `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, `AI_API_KEY`, timeout/max output tokens, strict allowlisted provider host(s) rather than arbitrary client URL. Implement schema/output and provider failure mapping. Run mocked tests by default. Add an explicit opt-in smoke-test command using only synthetic text, with bounded requests and no accidental spend. Optionally document local Ollama adapter as development-only; do not make GPU-dependent tests mandatory.
**Acceptance:** Hosted candidate responds with valid schema in a documented opt-in test; no credentials in Git/browser; legacy tests pass. If provider cannot be tested, record blockage without claiming success.
**Codex prompt:**
> Read plan, implement **Step 08 only**. Verify current official docs for two open-weight inference candidates and build a small configurable hosted-model adapter (OpenAI-compatible where supported), server-only secrets and clear provider errors. Add offline unit tests and an explicitly opt-in synthetic-text smoke test, but do not run chargeable calls or switch production without my approval. Document live-provider verification status and commit suggestion; no commit/push.

### Step 09 — Benchmark and select a model (DECISION GATE)
**Goal:** Choose based on quality and operations, not hype.
**Tasks:** Add `backend/evaluation/` with 12–20 nonprivate fixture passages, evaluation script and rubric. Evaluate both output types and counts 5/10/15; test exact schema success, groundedness/coverage with manual review, duplicate rate, median/p95 latency, rough costs, provider errors and model licenses. Save results as `docs/refactor/MODEL_EVALUATION.md` with timestamps, models, settings and actual numbers. Make opt-in network runs explicit. Recommend go/no-go. If no model passes, keep current provider behind abstraction until an acceptable option is available.
**Acceptance:** Documented decision supported by measured runs; no fabricated benchmarks.
**Codex prompt:**
> Read plan, perform **Step 09 only**. Build a reproducible synthetic/openly licensed benchmark corpus and evaluation runner for 5/10/15 flashcards and quiz questions, covering validity, grounding, uniqueness, speed and estimated cost. Run offline tests and only run paid/network benchmarks with explicit approval. Write `docs/refactor/MODEL_EVALUATION.md`; identify an evidence-based primary and fallback or state why decision is blocked. No production cutover, commit or push.

### Step 10 — Cut over to selected model with safe fallback
**Goal:** Production backend consumes the chosen model without frontend changes.
**Prerequisite:** Step 09 approved and actual provider credentials/config available.
**Tasks:** Set server-selected provider/model defaults per evaluation, add sensible bounded retry ONLY for transient failure or malformed output when safe and budgeted (no unlimited retry loops), handle provider 401/403/429/timeout/5xx, avoid exposing upstream exceptions. Keep fallback off by default or allow only explicitly approved alternate model with cost cap. Keep output and error shape stable. Remove legacy OpenAI-specific env docs if no longer supported; an OpenAI-compatible SDK may remain as transport even when provider is not OpenAI.
**Acceptance:** User can generate 5/10/15 items for both types; no frontend awareness of vendor; documented configuration and rollback.
**Codex prompt:**
> Read plan, implement **Step 10 only**, using the **approved** model/provider from `docs/refactor/MODEL_EVALUATION.md`. Wire it into the provider interface with bounded timeout/error handling and at most a budget-aware bounded retry. Preserve API payloads and UI, test mocked errors and success, update env examples. Do not provision, deploy, commit or push; report rollback config and Conventional Commit suggestion.

### Step 11 — Add abuse protection and cost controls (must precede public deployment)
**Goal:** Keep anonymous access without an uncontrolled AI bill.
**Tasks:** Choose a limiter that works across Vercel serverless instances (edge/WAF or shared external rate-limit store); do not rely on per-process in-memory counters in production. Enforce per-IP/request-category rate limits on *upload and generation*, request/body size limits, concurrency and timeout budgets where supported, global provider spend/quota alerts and manual kill switch for inference; return consistent 429 with `Retry-After` where practical. Be transparent about proxy/IP header trust; do not accept spoofed forwarded headers blindly. Consider privacy/cost and bot challenges only if necessary. Document local no-external-store testing behavior separately. Include no-auth threat model, denial-of-service and document-parser abuse considerations.
**Acceptance:** Limits apply across actual deployment instances, legitimate requests work, abusive bursts are rejected, secret keys remain server-only. If infra requires billing/approval, stop and document the exact setup rather than substituting fake protection.
**Codex prompt:**
> Read plan, implement **Step 11 only**. Propose and, if infrastructure is available, implement production-suitable shared/edge rate limiting for an anonymous Vercel Flask API, bounded concurrency/timeouts, abuse-safe 429 responses, provider budget controls and a server-side kill switch. Do not claim in-memory Flask limits are production protection. Add tests and a cloud configuration checklist. Stop for paid-service or security-policy decisions. No deployments/commits/pushes.

### Step 12 — Frontend resilience, accessibility, and truthful copy
**Goal:** Smooth study experience with public access.
**Tasks:** Keep existing UI; ensure landing CTAs reach dashboard, graceful upload/generation loading and failures, disable duplicate requests, clear old results when new file selected or generation starts (when appropriate), safe disabled controls, accessible file-delete button instead of clickable icon, keyboard-accessible modal and focus mode, meaningful error text and recovery. Confirm errors for 429/413/502/504. Remove inaccurate progress/spaced repetition/weak-spot claims from landing and READMEs; no scope creep into progress tracking. Add UI tests.
**Acceptance:** Keyboard and browser smoke tests pass; no phantom advertised features; no regressions in flashcard/quiz rendering.
**Codex prompt:**
> Read plan, implement **Step 12 only**: polish existing public upload/generate/review flows, accessible controls/modals, deduplicated submissions, error handling (413/429/502/504), and remove unsupported progress/spaced-repetition claims. Avoid redesign. Add frontend tests and run lint/build/tests. Report results and commit message; do not commit/push.

### Step 13 — Dependency/repository hygiene and documentation
**Goal:** A maintainable codebase for another developer or Codex session.
**Tasks:** Remove tracked `backend/app/**/__pycache__/*.pyc` from version control; ensure `.gitignore` covers Python caches, venv, `.env`, node_modules, build outputs. Check dependencies for unused libraries, pin reasonably and document Python/Node versions. Update root/frontend README with public use flow, architecture, actual AI provider setup, local Windows/WSL instructions, test commands, environment variable reference, privacy note, current limitations, request-size limits and Vercel deployment/rollback. Verify no secrets in tracked files (never print secret values). Add `docs/refactor/RELEASE_CHECKLIST.md`.
**Acceptance:** Fresh install instructions are accurate, no tracked generated Python binaries, no secrets, clean lint/build/backend tests.
**Codex prompt:**
> Read plan, implement **Step 13 only**. Remove tracked Python bytecode artifacts, fix ignores, clean clearly unused dependencies, update README/env/deployment/testing docs to match the public and model-agnostic architecture, and write a release checklist. Do not rotate/delete cloud secrets yourself. Verify fresh setup as feasible and summarize changes and commit suggestion; do not commit/push.

### Step 14 — Staging, security verification, launch, and rollback
**Goal:** Ship without guessing about serverless behavior.
**Tasks:** Verify locally then in a nonproduction Vercel preview with owner approval. Run complete automated suite; manually exercise anonymous landing/dashboard, TXT/PDF/DOCX/PPTX, 5/10/15 flashcard/quiz generation, malformed docs, file size >4MB, invalid JSON/count, provider failures, rate-limiting burst, CORS, keyboard flow and narrow/mobile layout. Verify response latency against provider/Vercel timeouts, secret isolation, redacted logs, spend limits, privacy/retention and exact CORS origins. Document measured results in `docs/refactor/RELEASE_CHECKLIST.md`. Plan rollback to previous deployment or previous backend provider config. Only after explicit owner approval: update production env, deploy, smoke-test and monitor. Manually review Supabase user data/export/deletion obligations before retiring the old project. Do not delete it casually.
**Acceptance:** Public site works without authentication; quality/abuse controls validated in deployed environment; rollback documented and testable; all checks recorded.
**Codex prompt:**
> Read plan, perform **Step 14 only**. Prepare and run all feasible local tests, a structured manual/preview-deployment checklist, and record observed results; verify no Supabase calls, working anonymous flows, provider schema, cost limits, rate limits and rollback readiness. Do not deploy or modify live cloud resources without explicit approval. If authorized, run staged smoke tests and report exact outcomes, outstanding blockers and final suggested commit/release notes.

## 5. End-to-end acceptance checklist

- [ ] `/` is public, CTA goes directly to public `/dashboard`; no login/signup/auth state, Supabase client, Supabase dependency, or Supabase env vars.
- [ ] New visitors can upload a supported TXT/PDF/DOCX/PPTX file (up to 4 MB) without an account.
- [ ] Extraction preserves the 2,000-word policy; malformed/encrypted/unreadable files fail safely.
- [ ] Flashcards and quizzes work for 5/10/15 with exact requested count and validated schema.
- [ ] Quizzes always have four distinct options and a valid `correct_answer`.
- [ ] AI models and credentials are configured **only on backend**; all output is verified server-side.
- [ ] Current provider and model are documented with real measurements, costs, licenses and rollback choice.
- [ ] Public upload/generation API has server-side input limits, effective distributed/edge throttling, quotas/alerts, and bounded retries/timeouts.
- [ ] No raw private notes or secrets appear in logs or repository; user-facing privacy limitations are documented.
- [ ] Frontend and backend tests pass; CI or repeatable commands documented.
- [ ] Fresh installation, Vercel configuration, CORS, and rollback instructions match deployed behavior.
- [ ] No unsupported promises about progress tracking or spaced repetition.
- [ ] Live release only after user signoff and a verified preview environment.

## 6. Suggested commit sequence (user executes after each accepted step)

1. `docs(refactor): document current SmartCards baseline`
2. `test: add API and frontend regression coverage`
3. `refactor(auth): make study experience publicly accessible`
4. `chore(auth): remove Supabase dependencies and configuration`
5. `fix(api): validate anonymous upload and generation requests`
6. `feat(ai): validate generated study content schemas`
7. `refactor(ai): introduce provider-independent generation service`
8. `feat(ai): add configurable hosted open-model adapter`
9. `test(ai): add reproducible model evaluation suite`
10. `feat(ai): enable evaluated model for content generation`
11. `feat(security): enforce public API usage controls`
12. `fix(frontend): improve anonymous study flow and accessibility`
13. `docs: update setup deployment and maintenance guidance`
14. `chore(release): document verification and rollout readiness`

## 7. How to work with Codex

Start a Codex session in the repository root and tell it: **"Read SMARTCARDS_REFACTOR_PLAN.md in full. Only perform the numbered step I name; report test results and stop."** Then paste the exact prompt under that step. Review the diff and tests before accepting a change; commit manually after acceptance. If a step uncovers a blocker, resolve that blocker before advancing. Do not let Codex silently combine steps or deploy services.

**Sources checked during planning:** repository tree and source files on `apoa5/smart-cards` main; official Groq Structured Outputs, Hugging Face Inference Providers Structured Outputs, and Ollama Structured Outputs documentation (all subject to changes in model availability and pricing). No live inference benchmarks, dependency install or execution tests were run during this planning review.
