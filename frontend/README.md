# SmartCards frontend

The SmartCards frontend is a React single-page application for authentication, document upload, and displaying AI-generated flashcards and quizzes. It uses Supabase for user sessions and communicates with the separate Flask backend through Axios.

For full-stack setup and deployment instructions, see the [project README](../README.md).

## Main features

- Public landing page with login and signup routes
- Supabase email/password authentication
- Route guards for authenticated and unauthenticated users
- Document upload with progress and API error feedback
- Selection of 5, 10, or 15 flashcards or quiz questions
- Interactive flashcard and multiple-choice quiz views
- Responsive interface styled with Tailwind CSS

## Frontend stack

| Technology | Role |
| --- | --- |
| React 19 | Component-based user interface |
| Vite | Development server and production bundler |
| React Router | Client-side pages and route protection |
| Supabase JS | Authentication and session management |
| Axios | Requests to the Flask API |
| Tailwind CSS | Utility-first styling |
| Heroicons | Interface icons |

## Getting started

### Prerequisites

- Node.js 20.19+ or 22.12+ and npm
- A running SmartCards backend, locally or remotely
- A Supabase project with email/password authentication enabled

### Installation

```bash
cd frontend
npm install
cp .env.example .env
```

Add the required values to `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then start Vite:

```bash
npm run dev
```

The app is available at `http://localhost:5173` by default. The backend must allow this address in its `CORS_ORIGINS` setting.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | No | Flask API URL; defaults to `http://localhost:5000` |
| `VITE_SUPABASE_URL` | Yes | URL of the Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public anon key used by the Supabase browser client |

Vite embeds variables prefixed with `VITE_` in the browser bundle. Never store private service-role keys or an OpenAI API key in this file.

## Application structure

```text
src/
├── components/
│   ├── FileUploader.jsx    # Upload and generation workflow
│   ├── FlashcardList.jsx   # Generated flashcard display
│   ├── QuizList.jsx        # Interactive quiz display
│   ├── PrivateRoute.jsx    # Authenticated-route guard
│   └── PublicRoute.jsx     # Guest-only route guard
├── context/
│   └── AuthContext.jsx     # Supabase session state and logout
├── pages/
│   ├── LandingPage.jsx
│   ├── Login.jsx
│   ├── Signup.jsx
│   └── Dashboard.jsx
├── api.js                  # Axios client and backend base URL
├── App.jsx                 # Route definitions and providers
├── index.css               # Global styles and Tailwind import
├── main.jsx                # React entry point
└── supabaseClient.jsx      # Supabase client configuration
```

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Product landing page |
| `/signup` | Signed-out users | Account creation |
| `/login` | Signed-out users | Existing user login |
| `/dashboard` | Signed-in users | Upload and content-generation workspace |

`AuthContext` restores the current Supabase session when the app loads and listens for later authentication changes. `PrivateRoute` and `PublicRoute` use that shared state to redirect users when needed.

## Backend integration

The configured Axios client sends requests to `VITE_API_BASE_URL`:

- `POST /api/upload` sends the selected file as `multipart/form-data`.
- `POST /api/generate_flashcards` sends extracted text and the requested item count.
- `POST /api/generate_quiz` sends extracted text and the requested item count.

Accepted upload formats are TXT, PDF, DOCX, and PPTX. The backend performs extraction and AI generation; the frontend does not call OpenAI directly.

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

Create a Vercel project with `frontend` as its Root Directory and add all three environment variables listed above. Set `VITE_API_BASE_URL` to the deployed backend, then deploy.

The included `vercel.json` rewrites requests to `index.html`, allowing React Router pages such as `/login` and `/dashboard` to load correctly after a refresh.
