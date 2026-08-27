# SmartCards

An AI-powered flashcards and quiz generator.

## Vercel deployment

Create two Vercel projects from this repository:

1. Set the backend project's Root Directory to `backend`. Add `OPENAI_API_KEY` and
   `CORS_ORIGINS` (the frontend URL, without a trailing slash) in its environment
   variables, then deploy it.
2. Set the frontend project's Root Directory to `frontend`. Add
   `VITE_API_BASE_URL` with the deployed backend URL, plus
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy it.

`CORS_ORIGINS` accepts a comma-separated list, so production and preview frontend
URLs can both be authorized. Redeploy a project after changing its environment
variables. The backend health check is available at `/api/health`.

For local development, copy each `.env.example` to `.env`. The frontend defaults
to `http://localhost:5000` and the backend allows Vite's local origin when the
corresponding variables are not set.
