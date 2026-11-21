# SmartCards

SmartCards is a full-stack study tool that turns class notes and learning materials into AI-generated flashcards and multiple-choice quizzes. Visitors can upload a supported document, and choose whether to generate 5, 10, or 15 study items from its content.

## What it does

- Extracts and cleans text from TXT, PDF, DOCX, and PPTX files
- Limits extracted content to 2,000 words before generation
- Generates question-and-answer flashcards with OpenAI
- Generates multiple-choice quizzes with immediate answer feedback
- Supports separate frontend and backend deployments on Vercel

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| API client | Axios |
| Backend | Python, Flask, Flask-CORS |
| AI | Provider interface with a legacy OpenAI adapter |
| Document parsing | PyPDF2, python-docx, python-pptx |
| Deployment | Vercel |

## How it works

1. The visitor uploads a document from the public dashboard.
2. The Flask API extracts readable text and returns a preview and word count.
3. The visitor selects a content type and item count.
4. The backend sends the extracted text to the configured provider, validates the output, and returns structured JSON.
5. React renders the generated flashcards or interactive quiz in the browser.

The browser sends study documents and generation requests to Flask. The OpenAI API key remains on the server.

## Project structure

```text
.
├── frontend/               # React single-page application
│   ├── src/
│   │   ├── components/     # Upload, flashcard, and quiz components
│   │   ├── pages/          # Landing and dashboard pages
│   │   └── api.js          # Configured backend API client
│   └── vercel.json         # SPA routing configuration
└── backend/                # Flask API
    ├── api/index.py        # Vercel serverless entry point
    ├── app/
    │   ├── ai.py           # OpenAI generation logic
    │   ├── routes.py       # API endpoints
    │   └── utils/          # Text extraction and preprocessing
    └── run.py              # Local development entry point
```

## Local setup

### Prerequisites

- Node.js 20.19+ or 22.12+ and npm
- Python 3.10 or later
- Optional legacy OpenAI credentials for existing integrations that already use them. Offline tests require no credentials.

### 1. Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update `backend/.env`:

```env
CORS_ORIGINS=http://localhost:5173
```

Then start Flask:

```bash
python run.py
```

The API runs at `http://localhost:5000`. Confirm it is available at `http://localhost:5000/api/health`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

Update `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173`, select **Get started**, and upload a supported document from the dashboard.

### Inference configuration

The backend separates prompts, provider calls, JSON decoding, and study item
validation. Offline tests inject a fake provider or mock the legacy client.

The only adapter in this step is **legacy OpenAI for compatibility**. An
existing installation with `OPENAI_API_KEY` continues to use that adapter
when `AI_PROVIDER` is unset. To select it explicitly, set
`AI_PROVIDER=legacy_openai`. Its default model is `gpt-3.5-turbo` and
`AI_MODEL` can override it. Without provider credentials, health checks and
uploads remain available and generation returns HTTP 502. Legacy OpenAI is
a transitional option, with no production provider selected for the migration.

The planned hosted configuration is `AI_PROVIDER=openai_compatible` with
server-side `AI_MODEL`, `AI_BASE_URL`, and `AI_API_KEY`. The hosted selector
is currently unsupported and fails closed, even if a legacy key is present.
No provider, including a hosted service such as Groq, is guaranteed free or
available. Verify account-level quotas, model access, and pricing before
selecting or enabling a provider.

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

Input errors use `{"error":"..."}`. Classified generation failures retain
their existing HTTP status and `{"error":"...","code":"..."}` response.
Malformed, truncated, or invalid model output returns HTTP 502 with
`code: "invalid_ai_response"`.

## Useful frontend commands

Run these from `frontend/`:

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run lint      # Check the frontend with ESLint
npm run preview   # Preview the production build locally
```

## Deploying to Vercel

Deploy the repository as two Vercel projects:

1. Create a backend project with `backend` as its Root Directory. Set `CORS_ORIGINS` and follow the inference configuration above for generation.
2. Create a frontend project with `frontend` as its Root Directory. Add `VITE_API_BASE_URL`, then deploy it.
3. Set `VITE_API_BASE_URL` to the deployed backend URL and `CORS_ORIGINS` to the deployed frontend URL. Redeploy after changing environment variables.

`CORS_ORIGINS` accepts a comma-separated list, which is useful when production and preview frontend URLs both need API access. Do not add a trailing slash to an origin.

## Notes and limitations

- Only extractable text is used; scanned PDFs require OCR before upload.
- Extraction is capped at 2,000 words to keep generation requests manageable.
- The legacy adapter defaults to `gpt-3.5-turbo` for both flashcards and quizzes.
- AI-generated study material can contain mistakes. Verify important facts against the source.
- Keep `OPENAI_API_KEY` on the backend. Never expose it through a `VITE_` variable.

### Upload and CORS troubleshooting

For the current production domains, set these Vercel environment variables:

- Backend: `CORS_ORIGINS=https://smart-cards-olive.vercel.app`
- Frontend: `VITE_API_BASE_URL=https://smart-cards-kvoz.vercel.app`
- Legacy generation requires an existing server-side credential and available account quota.

Redeploy both projects after changing environment variables. An explicit
`CORS_ORIGINS` replaces the defaults; include every frontend origin you use.

Uploads are limited to 4,000,000 bytes (4 MB), leaving multipart overhead below
[Vercel's 4.5 MB request limit](https://vercel.com/docs/functions/limitations).
Vercel can reject oversized requests before Flask runs, so those responses may
appear as CORS or Axios network errors. Increasing Flask's limit cannot bypass
Vercel's limit. Compress or split larger documents; supporting larger originals
requires direct uploads to object storage and backend retrieval, or hosting the
API on a service that accepts larger requests. Legacy `.ppt` files must first
be saved as `.pptx`.

Generation uses `/api/generate_flashcards` and `/api/generate_quiz`, not
`/api/upload`. If the console reports `/api/upload`, inspect that request in the
Network panel separately. For failures on small requests, check the backend
function logs for startup failures, provider errors, or platform timeouts.
