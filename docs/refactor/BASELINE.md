# SmartCards baseline

Inspected on 2026-11-21 at `main`, commit `ef6fa797d18d06135303d922cd34cab179697f2f`. The refactor plan was already an untracked file when the audit began. This baseline combines source inspection with local checks. Live Vercel, Supabase, and OpenAI behavior and browser interactions were outside the verification run.

## Architecture and dependencies

- **Frontend** — `frontend/src/main.jsx` mounts a React SPA. `App.jsx` defines client routes. Vite builds the app with React and Tailwind plugins. `src/api.js` creates a separate Axios client for Flask.
- **Backend** — `backend/app/__init__.py` creates the Flask app, configures CORS and error handlers, and registers the routes blueprint. `backend/run.py` runs the local debug server. `backend/api/index.py` exposes the Flask app for Vercel.
- **Study data** — `FileUploader.jsx` sends the original file to Flask. Extraction returns processed text and word count. The browser keeps the text in React state and sends it back when the user requests generation. Flask sends the text in an OpenAI prompt and returns parsed output. The renderers keep study state locally. The application has no study-history database or durable document storage in its code.
- **Extraction** — `app/utils/utils.py` reads UTF-8 TXT, PDF page text, DOCX paragraphs, and PPTX shapes with text. `preprocess_text.py` collapses whitespace, attempts line deduplication and section prioritization, then trims to 2,000 words. Collapsing newlines first prevents line-based deduplication from working as intended. There is no OCR.
- **Generation** — `app/ai.py` creates an OpenAI client per generation with a 40-second timeout and zero SDK retries. Both functions call hardcoded `gpt-3.5-turbo` with temperature 0.7 and a 1,000-token output cap. They reject length-truncated replies, strip the expected JSON code fences, and parse JSON. Schema and requested item count are unchecked.

| Manifest | Resolved or installed versions |
| --- | --- |
| Frontend runtime dependencies | React and React DOM 19.1.0, React Router DOM 7.7.1, Axios 1.11.0, Supabase JS 2.54.0, Heroicons 2.2.0, Tailwind Vite plugin 4.1.11 |
| Frontend development dependencies | Vite 7.0.5, React Vite plugin 4.6.0, Tailwind CSS 4.1.11, PostCSS 8.5.6, Autoprefixer 10.4.21, ESLint and @eslint/js 9.31.0, React Hooks ESLint plugin 5.2.0, React Refresh ESLint plugin 0.4.20, globals 16.3.0, React types 19.1.8, React DOM types 19.1.6 |
| Backend application dependencies | Flask 3.1.1, Flask-CORS 6.0.1, Werkzeug 3.1.3, OpenAI 1.98.0, python-dotenv 1.1.1, PyPDF2 3.0.1, python-docx 1.2.0, python-pptx 1.0.2 |
| Backend supporting dependencies | All 40 installed versions matched `backend/requirements.txt`. The manifest also pins Pydantic 2.11.7, Hugging Face Hub 0.34.3, and hf-xet 1.1.5. Application generation code uses the OpenAI SDK and Python JSON parsing. |

Frontend versions are from `frontend/package-lock.json`. The README lists Node 20.19+ or 22.12+ and Python 3.10+.

## Authentication and navigation

- `supabaseClient.jsx` initializes the browser SDK from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `AuthContext.jsx` restores the session with `getSession`, subscribes to auth changes, exposes user/loading/auth state and logout, and unsubscribes on unmount.
- `App.jsx` wraps routing in `AuthProvider`. The public `/` landing page links to `/signup`. `PublicRoute.jsx` redirects authenticated users visiting `/signup` or `/login` to `/dashboard`. `PrivateRoute.jsx` redirects signed-out dashboard visitors to `/login`. Both guards render nothing during session loading. There is no catch-all route.
- `Login.jsx` calls `signInWithPassword`. `Signup.jsx` calls `signUp` with email/password and first name, last name, and username metadata. Both navigate to the dashboard on SDK success. Access after signup still depends on whether Supabase supplies a session.
- `Dashboard.jsx` shows the username and a logout confirmation. Logout calls Supabase `signOut`, clears the context user, and navigates home. `api.js` attaches no Supabase token, and Flask checks no session. The dashboard guard protects browser navigation only.
- Root and frontend READMEs, `frontend/.env.example`, and the frontend package manifest and lockfile also reference Supabase.

## API contracts

| Method and path | Request | Success |
| --- | --- | --- |
| `GET /api/health` | No body | 200 `{"status":"ok"}` |
| `POST /api/upload` | Multipart field `file`. Case-insensitive TXT, PDF, DOCX, or PPTX extension. Up to 4,000,000 file bytes. | 200 `{"preview":"processed text","word_count":N}` |
| `POST /api/generate_flashcards` | JSON object with `text` and optional `count` (default 5). Browser sends 5, 10, or 15. | 200 `{"flashcards":[{"question":"...","answer":"..."}]}` expected by the UI |
| `POST /api/generate_quiz` | Same input as flashcards | 200 `{"quiz":[{"question":"...","options":["A","B","C","D"],"correct_answer":"A"}]}` expected by the UI |

- Upload returns 400 with `{"error":"..."}` for missing files, legacy DOC/PPT, unsupported extensions, parser failures, or empty extraction. Oversized files or requests return 413 with the same envelope. Flask's request cap is 4,100,000 bytes.
- Generation returns 400 with `{"error":"No text provided"}` for missing or falsy text and 502 with an error message for a falsy parsed result. Routes call `request.get_json()` and assume an object. Malformed JSON and wrong content types use Flask's default 400 and 415 responses, respectively. Valid JSON with a non-object root can hit the generic JSON 500 handler. Whitespace-only text, truthy non-string values, and arbitrary supplied counts pass the route checks. The 2,000-word limit applies only to extraction.
- Classified generation errors use `{"error":"...","code":"..."}`. HTTP 502 covers `missing_api_key`, `invalid_api_key`, `insufficient_quota`, `model_access`, `invalid_ai_response`, and `ai_unavailable`. `rate_limited` returns 429 and `ai_timeout` returns 504.
- Generation accepts any truthy parsed JSON. It does not enforce arrays, required fields, exact counts, distinct quiz options, or answer membership. The application has no server-side request throttling. CORS limits browser cross-origin access and does not enforce API authentication.

## Feature matrix

| Feature | Current behavior | Evidence |
| --- | --- | --- |
| Landing and dashboard | Public landing sends users to signup. Study workspace requires a browser session. | Source |
| Upload | Four supported extensions, file size checks, loading and errors, filename and extracted word count. | Source; backend tests exercise TXT, legacy PPT, broken PDF, and both size limits |
| Generation | Separate flashcard and quiz requests with a 5/10/15 count picker. | Source; mocked backend responses and provider failures |
| Flashcard review | Flip to reveal answers, arrow and numbered navigation, focus mode. | Source |
| Quiz review | Answer selection, immediate feedback, navigation, score/reset, focus mode. | Source |
| Long-term study | Landing copy mentions progress, spaced repetition, and weak spots. The implementation tracks only current browser review state. | Source |

## Deployment and configuration

The READMEs describe separate Vercel projects rooted at `frontend/` and `backend/`. Frontend rewrites target `/index.html` for SPA navigation. Backend rewrites target `/api/index`. `VITE_API_BASE_URL` defaults to `http://localhost:5000`; the Supabase settings are browser configuration. `OPENAI_API_KEY` stays server-side and is checked at generation time. Backend `CORS_ORIGINS` is a comma-separated override for `/api/*`; whitespace and trailing slashes are stripped. Defaults are `http://localhost:5173`, `http://127.0.0.1:5173`, and `https://smart-cards-olive.vercel.app`. The root README documents Vercel's 4.5 MB request ceiling, which can cause rejection before Flask handles a request. Seven Python bytecode files are already tracked under `backend/app/` and its utility directory.

## Existing tests and baseline checks

- `backend/tests/test_api.py` has five unittest methods covering POST preflights, TXT upload, unsupported legacy PPT, broken PDF, file and request size limits, mocked generation success and empty results on both routes, and explicit CORS override via health.
- `backend/tests/test_generation_errors.py` has three methods covering missing credentials on both routes, provider error classification and sanitized messages, and a mocked truncated flashcard response.
- Backend gaps include valid PDF/DOCX/PPTX fixtures, the extraction word cap, health payload assertions, malformed generation requests, count validation, schema validation, and live provider behavior. The frontend has dev, build, lint, and preview scripts with no test runner or automated UI suite.

| Directory | Command | Observed result |
| --- | --- | --- |
| `frontend/` | `node -v`, `npm -v` | Node v22.23.3 and npm 10.9.9 |
| `frontend/` | `npm ci --no-audit --no-fund` | Initial sandbox run exited 1 with esbuild `spawnSync ... EPERM`. Approved rerun outside the sandbox exited 0 and installed 222 packages. |
| `frontend/` | `npm run lint` | Exit 1, one error and zero warnings. `src/context/AuthContext.jsx:5:14` violates `react-refresh/only-export-components` by exporting the context alongside the provider. |
| `frontend/` | `npm run build` | Exit 0. Vite 7.0.5 transformed 824 modules and produced `dist/` with the existing local configuration. |
| `backend/` | `python --version` | Exit 127. The pyenv shim did not have a selected `python`; the test run used the existing project virtual environment instead. |
| `backend/` | `venv/bin/python --version`, `venv/bin/python -m pip check` | Python 3.12.3. No broken requirements. |
| `backend/` | `PYTHONDONTWRITEBYTECODE=1 venv/bin/python -m unittest discover -s tests -v` | Exit 0, 8 tests passed. Output included the expected corrupt-PDF and generation-error logs, a PyPDF2 deprecation warning, and unclosed-file resource warnings. No live provider calls. |
