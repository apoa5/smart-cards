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
| AI | OpenAI API using `gpt-3.5-turbo` |
| Document parsing | PyPDF2, python-docx, python-pptx |
| Deployment | Vercel |

## How it works

1. The visitor uploads a document from the public dashboard.
2. The Flask API extracts readable text and returns a preview and word count.
3. The visitor selects a content type and item count.
4. The backend sends the extracted text to OpenAI's `gpt-3.5-turbo` model and returns structured JSON.
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
- An OpenAI API key

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
OPENAI_API_KEY=your_openai_api_key
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

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check whether the API is running |
| `POST` | `/api/upload` | Upload multipart form data and extract document text |
| `POST` | `/api/generate_flashcards` | Generate flashcards from JSON `text` and optional `count` values |
| `POST` | `/api/generate_quiz` | Generate quiz questions from JSON `text` and optional `count` values |

The upload endpoint accepts `.txt`, `.pdf`, `.docx`, and `.pptx`. Legacy `.doc` and `.ppt` files must be converted to their newer formats first.

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

1. Create a backend project with `backend` as its Root Directory. Add `OPENAI_API_KEY` and `CORS_ORIGINS`, then deploy it.
2. Create a frontend project with `frontend` as its Root Directory. Add `VITE_API_BASE_URL`, then deploy it.
3. Set `VITE_API_BASE_URL` to the deployed backend URL and `CORS_ORIGINS` to the deployed frontend URL. Redeploy after changing environment variables.

`CORS_ORIGINS` accepts a comma-separated list, which is useful when production and preview frontend URLs both need API access. Do not add a trailing slash to an origin.

## Notes and limitations

- Only extractable text is used; scanned PDFs require OCR before upload.
- Extraction is capped at 2,000 words to keep generation requests manageable.
- Both flashcards and quiz questions are generated with `gpt-3.5-turbo`.
- AI-generated study material can contain mistakes. Verify important facts against the source.
- Keep `OPENAI_API_KEY` on the backend. Never expose it through a `VITE_` variable.

### Upload and CORS troubleshooting

For the current production domains, set these Vercel environment variables:

- Backend: `CORS_ORIGINS=https://smart-cards-olive.vercel.app`
- Frontend: `VITE_API_BASE_URL=https://smart-cards-kvoz.vercel.app`
- Backend: a valid `OPENAI_API_KEY` with available provider quota.

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
