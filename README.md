# SmartCards

SmartCards is a full-stack study tool that turns class notes and learning materials into AI-generated flashcards and multiple-choice quizzes. Visitors can upload a supported document, and choose whether to generate 5, 10, or 15 study items from its content.

## What it does

- Extracts and cleans text from TXT, PDF, DOCX, and PPTX files
- Limits extracted content to 2,000 words before generation
- Generates question-and-answer flashcards with the configured inference provider
- Generates multiple-choice quizzes with immediate answer feedback
- Supports separate frontend and backend deployments on Vercel

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| API client | Axios |
| Backend | Python, Flask, Flask-CORS |
| AI | Opt-in Groq inference and legacy OpenAI compatibility |
| Document parsing | PyPDF2, python-docx, python-pptx |
| Deployment | Vercel |

## Architecture and study workflow

1. Open the React/Vite landing page and choose **Get started**, or visit
   `/dashboard` directly. The study workflow is anonymous.
2. React sends the file as multipart data to Flask. Flask extracts and
   preprocesses readable text, then returns a preview and word count.
3. Choose flashcards or a multiple-choice quiz and request 5, 10, or 15 items.
   React posts the extracted text and count to Flask. Flask validates the
   inputs and sends the study prompt to the configured Groq adapter.
4. Flask parses and validates the model output, then React renders the
   flashcards or quiz. The app keeps study results in the current browser
   session's page state. Refreshing the page clears that state.

On Vercel, Flask checks trusted client identity and shared Upstash Redis
budgets before parsing protected requests. Redis stores pseudonymous
counters, while Groq receives the extracted study text during generation.

| Path | Role |
| --- | --- |
| `frontend/src/` | Browser routes, uploader, and study controls |
| `backend/run.py`, `backend/api/index.py` | Local and Vercel Flask entry points |
| `backend/app/routes.py`, `backend/app/utils/` | API input validation and document extraction |
| `backend/app/ai.py`, `backend/app/groq_provider.py`, `backend/app/study_output.py` | Prompting, inference, and study output validation |
| `backend/app/rate_limit.py` | Shared Redis request budgets |
| `backend/evaluation/` | Bounded, opt-in evaluation with synthetic passages |

## Local setup

Use Python 3.12 (verified with 3.12.3) and Node.js 22.12 or newer (verified
with 22.23.3 and npm 10.9.9). The current Vite version also accepts Node.js
20.19+ within the 20.x line.

From `backend/` on Linux, macOS, or WSL:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python run.py
```

For native Windows PowerShell, use `py -3.12 -m venv .venv` and
`.\.venv\Scripts\python.exe -m pip install -r requirements.txt`.
Start Flask with `.\.venv\Scripts\python.exe run.py`.

Flask serves the local API at `http://localhost:5000`. Check
`/api/health` for basic startup. The local server runs in debug mode and is
for development. A local `.env` file is optional. Use
`backend/.env.example` as a template to enable generation or override CORS.
Set `CORS_ORIGINS` to the actual frontend origin if it differs from the local
defaults. Local runs can extract files without Redis or inference credentials.

In a second terminal, from `frontend/`:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. The frontend defaults to the local Flask URL.
Set the optional `VITE_API_BASE_URL` in `frontend/.env` only to use a different
backend. Vite exposes `VITE_` values to the browser, so keep provider and
Redis credentials in the backend environment.

### Inference configuration

To try Groq locally, set these values in the backend environment.

```env
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=your_groq_api_key
```

`AI_MODEL` defaults to `openai/gpt-oss-20b` for Groq. The adapter uses Groq's
fixed OpenAI-compatible endpoint, a 30-second SDK timeout, a 4,096-token
completion cap, and no automatic retries or fallback. Keep `GROQ_API_KEY`
server-side. Groq generation requires no OpenAI API key. The existing prompts
ask for JSON arrays in ordinary chat completions. The server parses and
validates those arrays with the same rules as the legacy adapter. Groq's JSON
Object Mode is for object responses, while the current prompts require arrays.
[Groq API reference](https://console.groq.com/docs/api-reference),
[OpenAI compatibility](https://console.groq.com/docs/openai),
[structured outputs](https://console.groq.com/docs/structured-outputs).

Groq lists `openai/gpt-oss-20b` and `openai/gpt-oss-120b`; the latter is an
alternate candidate for later evaluation. The weights are Apache 2.0 licensed.
Hosted model availability, pricing, and free-tier limits may change. Check
your account's model access and quota before enabling inference. Extracted
study text is sent to Groq when selected, so review its data controls before
using private documents. [Groq models and pricing](https://console.groq.com/docs/models),
[rate limits](https://console.groq.com/docs/rate-limits),
[data controls](https://console.groq.com/docs/your-data),
[gpt-oss licensing](https://openai.com/index/introducing-gpt-oss/).

Existing installations can continue using `OPENAI_API_KEY` with
`AI_PROVIDER=legacy_openai`, or with `AI_PROVIDER` unset. The legacy model
defaults to `gpt-3.5-turbo`. Health and uploads work without inference
credentials. Generation requires credentials for the selected provider.

To authorize one live Groq request with synthetic text, configure the backend
environment above and run one of these commands from `backend/`. Each command
requests five items and may consume account quota. The smoke test prints a
validated item count or a sanitized failure code.

```bash
python -B -m groq_smoke flashcards --live
python -B -m groq_smoke quiz --live
```

The original system prompts remain active. The revised prompts are
experimental and selectable only in the evaluation CLI. A real Groq run of
the original prompts returned six valid outputs, with quality issues in
source grounding and distractors. A later revised run returned one valid
output and five unavailable responses. These runs do not establish production
readiness. [Evaluation results and comparison](docs/evaluation/README.md#prompt-comparison).

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check whether the API is running |
| `POST` | `/api/upload` | Upload multipart form data and extract document text |
| `POST` | `/api/generate_flashcards` | Generate flashcards from JSON `text` and optional `count` values |
| `POST` | `/api/generate_quiz` | Generate quiz questions from JSON `text` and optional `count` values |

### Upload

Send a multipart form with a named `file` field. The filename must end in
`.txt`, `.pdf`, `.docx`, or `.pptx` (case-insensitive). Convert legacy
`.doc` and `.ppt` files before uploading. The file limit is 4,000,000 bytes.
A successful upload returns `{"preview":"...","word_count":N}`, with extracted
text capped at 2,000 words. Missing filenames, unsupported formats, unreadable
files, and empty extraction return HTTP 400.

### Generation

Send a JSON object with an `application/json` or `application/*+json` content
type. The `text` field must be a string with content after trimming. It can
contain up to 32,000 characters before trimming and 2,000 whitespace-separated
words after trimming. These limits apply to every generation request, including
direct requests without an upload. The optional `count` must be the JSON
integer `5`, `10`, or `15`. Omitting it defaults to `5`.

Successful responses are `{"flashcards":[...]}` and `{"quiz":[...]}`. Each
array contains exactly the requested number of items.

- A flashcard has exactly `question` and `answer`, both nonblank strings.
- A quiz item has exactly `question`, `options`, and `correct_answer`.
  The question and answer are nonblank strings. Options are four distinct,
  nonblank strings. The correct answer must match one option exactly,
  including case and whitespace.
- Questions must be distinct within a response. Uniqueness checks for questions
  and options ignore surrounding whitespace. Returned strings retain their
  original content.

### Errors

| Status | When |
| --- | --- |
| 400 | Invalid upload, missing or malformed JSON, a non-object JSON body, or invalid `text` or `count` |
| 413 | File or generation text exceeds its limit, or Flask rejects the request body above 4,100,000 bytes |
| 415 | Generation request uses a non-JSON content type |
| 429 | Application request budget exhausted or upstream rate limited |
| 502 | Model output is invalid or generation fails |
| 503 | Usage controls are unavailable or generation is disabled |
| 504 | Inference timeout |

SmartCards may return HTTP 429 with `code: rate_limited` and a
`Retry-After` header when an application request budget is exhausted.
See [anonymous API usage controls](docs/refactor/API_USAGE_CONTROLS.md).

Input errors use `{"error":"..."}`. Classified generation failures retain
their existing HTTP status and `{"error":"...","code":"..."}` response.
Malformed, truncated, or invalid model output returns HTTP 502 with
`code: "invalid_ai_response"`.

## Verification

| Directory | Command | Coverage |
| --- | --- | --- |
| `backend/` | `python -B -m unittest discover -s tests -v` | Unit tests, Flask test-client integration, and mocked Groq and Redis requests |
| `frontend/` | `npm test` | React routing and study interactions in jsdom with mocked API calls |
| `frontend/` | `npm run lint` | ESLint |
| `frontend/` | `npm run build` | Production bundle |

Automated tests require no live service credentials. The
[testing guide](docs/refactor/TESTING.md) distinguishes offline checks, local
preview checks, and live inference or deployment verification.

## Deploying to Vercel

Use separate Vercel projects rooted at `frontend/` and `backend/`. The
frontend rewrites application paths to `index.html`; the backend rewrites
API traffic to its Flask function. Set Vite's `VITE_API_BASE_URL` to the
backend HTTPS origin. On the backend, set `CORS_ORIGINS` to the exact allowed
frontend origins as a comma-separated list without trailing slashes. Configure
Groq as above. Apply environment changes through a new deployment.

Protected backend routes require a writable shared Upstash Redis REST
store and a valid Vercel-provided client identity. They fail closed with
HTTP 503 if either is unavailable. Set `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_KEY_SECRET` in the backend
environment. The default limits are 6 generation requests per client per
10 minutes across both routes, 8 uploads per client per minute, and 100
generation requests globally per 24 hours. These are application budgets.
See the [limiter configuration](docs/refactor/API_USAGE_CONTROLS.md) and
[release checklist](docs/refactor/RELEASE_CHECKLIST.md) for preview validation
and rollback preparation.

Flask limits request bodies to 4,100,000 bytes and uploaded files to
4,000,000 bytes. Vercel's default request cap is 4.5 MB. If Vercel rejects a
request before Flask handles it, the browser may report a generic network or
CORS failure. Check the selected file size, API URL, and allowed origins
before retrying. [Vercel Functions limits](https://vercel.com/docs/functions/limitations).

## Limitations and privacy

- Scanned PDFs require OCR before upload. SmartCards extracts readable
  document text and caps the preview at 2,000 words.
- Generated material may contain mistakes, unsupported details, repeated
  ideas, or ambiguous answer choices. Verify important facts against the
  document. Schema validation checks structure and counts.
- Flask receives the original file and sends extracted text to the configured
  provider only during generation. Review the provider's data controls before
  submitting sensitive material. The application does not persist study
  history. Redis stores usage counters only.
- Free-tier model access and account quotas can change. Redis failure,
  exhausted budgets, or provider limits can interrupt uploads or generation.
  The request budgets do not guarantee token consumption or concurrency
  limits. Cross-origin clients may display a general wait message when
  `Retry-After` is unavailable.
