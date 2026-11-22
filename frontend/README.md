# SmartCards frontend

The SmartCards frontend is a React single-page application for uploading documents and displaying generated flashcards and quizzes. It communicates with the separate Flask backend through Axios.

For full-stack setup and deployment instructions, see the [project README](../README.md).

## Main features

- Public landing page and study dashboard
- Document upload with processing status and API error feedback
- Selection of 5, 10, or 15 flashcards or quiz questions
- Interactive flashcard and multiple-choice quiz views
- Responsive interface styled with Tailwind CSS

## Frontend stack

| Technology | Role |
| --- | --- |
| React 19 | Component-based user interface |
| Vite | Development server and production bundler |
| React Router | Client-side navigation |
| Axios | Requests to the Flask API |
| Tailwind CSS | Utility-first styling |
| Heroicons | Interface icons |

## Getting started

### Prerequisites

- Node.js 22.12+ and npm (verified with Node 22.23.3 and npm 10.9.9)
- A running SmartCards backend, locally or remotely

### Installation

```bash
cd frontend
npm ci
```

For a different backend, create `.env` from `.env.example` and update the API origin. The local default is:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Then start Vite:

```bash
npm run dev
```

Open `http://localhost:5173` and select **Get started**. The backend must allow the actual frontend origin in `CORS_ORIGINS`. See the [local backend setup](../README.md#local-setup).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | No | Flask API URL; defaults to `http://localhost:5000` |

Vite embeds variables prefixed with `VITE_` in the browser bundle. Keep inference provider keys in the backend environment.

## Application structure

```text
src/
├── components/
│   ├── FileUploader.jsx    # Upload and generation workflow
│   ├── FlashcardList.jsx   # Generated flashcard display
│   └── QuizList.jsx        # Interactive quiz display
├── pages/
│   ├── LandingPage.jsx
│   └── Dashboard.jsx
├── api.js                  # Axios client and backend base URL
├── App.jsx                 # Route definitions
├── index.css               # Global styles and Tailwind import
└── main.jsx                # React entry point
```

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Product landing page |
| `/dashboard` | Public | Upload and content-generation workspace |
| `/login`, `/signup` | Public | Legacy URLs that redirect to `/dashboard` |

## Backend integration

The configured Axios client sends requests to `VITE_API_BASE_URL`:

- `POST /api/upload` sends the selected file as `multipart/form-data`.
- `POST /api/generate_flashcards` sends extracted text and the requested item count.
- `POST /api/generate_quiz` sends extracted text and the requested item count.

Accepted upload formats are TXT, PDF, DOCX, and PPTX. The backend extracts the text and generates flashcards and quiz questions through its configured inference provider.

## Scripts

```bash
npm run dev       # Start the development server with hot reload
npm run build     # Build optimized assets into dist/
npm run lint      # Run ESLint across the frontend
npm run preview   # Serve the production build locally
```

Before deploying a change, run:

```bash
npm run lint
npm run build
```

## Vercel deployment

Create a Vercel project with `frontend` as its Root Directory and set `VITE_API_BASE_URL` to the deployed backend, then deploy.

The included `vercel.json` rewrites requests to `index.html` so that a direct visit or refresh at `/dashboard` loads the SPA. The backend project handles Groq, Redis, and CORS. See the [deployment guide](../README.md#deploying-to-vercel).

## Automated tests

From `frontend/`, install the locked dependencies with `npm ci` and run
`npm test`. Vitest runs the React Testing Library suites in jsdom. The tests
exercise public routing, legacy redirects, upload controls, and study
renderers. The study tests mock the Axios client and run without
credentials or network services after dependency installation. The dialog
tests simulate browser dialog behavior in jsdom. Mobile browser and
assistive-technology checks remain pending.

See the [regression test notes](../docs/refactor/TESTING.md) for backend
commands and known baseline issues.

## Upload and study behavior

SmartCards announces uploads and generation in progress. Both generation
buttons are disabled while a request is pending. You can replace or remove
a document at any time. That clears its results and cancels the browser
request where possible. A request that already reached the server may still
complete and count toward its request budget.

Empty and unsupported files are rejected before upload. The file limit is
4 MB. If SmartCards returns an application rate limit, the page suggests a
retry time when the browser can read `Retry-After`. Cross-origin responses
that do not expose that header show a general wait message.

Use Tab to reach study controls and Enter or Space to activate buttons.
With a flashcard focused, use Left or Right Arrow to browse cards. Use the
standard radio-button keys to select a quiz answer, then activate Submit.
Escape closes the item-count and focus dialogs and returns focus to the
control that opened them.

## Editorial visual system

The landing page and study workspace share warm paper surfaces, sage accents,
and a muted ink palette. The bundled Latin subsets of DM Serif Display and
Inter live in `src/assets/fonts/` with licenses in `public/font-licenses/`. Other characters use the
system font fallbacks. Study controls keep the existing keyboard interactions
and honor reduced-motion preferences.
