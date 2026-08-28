# SmartCards

SmartCards is a full-stack study tool that turns class notes and learning materials into AI-generated flashcards and multiple-choice quizzes. Users can create an account, upload a supported document, and choose whether to generate 5, 10, or 15 study items from its content.

## What it does

- Authenticates users with Supabase email and password authentication
- Extracts and cleans text from TXT, PDF, DOCX, and PPTX files
- Limits extracted content to 2,000 words before generation
- Generates question-and-answer flashcards with OpenAI
- Generates multiple-choice quizzes with immediate answer feedback
- Protects the dashboard from unauthenticated access
- Supports separate frontend and backend deployments on Vercel

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| API client | Axios |
| Authentication | Supabase Auth |
| Backend | Python, Flask, Flask-CORS |
| AI | OpenAI API |
| Document parsing | PyPDF2, python-docx, python-pptx |
| Deployment | Vercel |

## How it works

1. Supabase creates or restores the user's authentication session.
2. The user uploads a document from the protected dashboard.
3. The Flask API extracts readable text and returns a preview and word count.
4. The user selects a content type and item count.
5. The backend sends the extracted text to OpenAI and returns structured JSON.
6. React renders the generated flashcards or interactive quiz in the browser.

The browser communicates with Supabase directly for authentication. Study documents and generation requests are sent to the Flask API; the OpenAI API key remains on the server.

## Project structure

```text
.
├── frontend/               # React single-page application
│   ├── src/
│   │   ├── components/     # Upload, flashcard, quiz, and route components
│   │   ├── context/        # Shared authentication state
│   │   ├── pages/          # Landing, login, signup, and dashboard pages
│   │   ├── api.js          # Configured backend API client
│   │   └── supabaseClient.jsx
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
- A Supabase project
- An OpenAI API key

### 1. Configure Supabase

Create a Supabase project and enable email/password authentication. Find the project URL and anon key under the project's API settings. The anon key is designed for browser use; authorization should still be enforced through Supabase policies.

### 2. Start the backend

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

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

Update `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173`, create an account, and upload a supported document from the dashboard.

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
2. Create a frontend project with `frontend` as its Root Directory. Add `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`, then deploy it.
3. Set `VITE_API_BASE_URL` to the deployed backend URL and `CORS_ORIGINS` to the deployed frontend URL. Redeploy after changing environment variables.

`CORS_ORIGINS` accepts a comma-separated list, which is useful when production and preview frontend URLs both need API access. Do not add a trailing slash to an origin.

## Notes and limitations

- Only extractable text is used; scanned PDFs require OCR before upload.
- Extraction is capped at 2,000 words to keep generation requests manageable.
- AI-generated study material can contain mistakes. Verify important facts against the source.
- Keep `OPENAI_API_KEY` on the backend. Never expose it through a `VITE_` variable.
