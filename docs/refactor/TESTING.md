# SmartCards regression tests

The regression suites exercise the current application. Test data is synthetic,
and test execution requires no credentials, running servers, or provider access.

## Running locally

Install frontend dependencies with `npm ci` from `frontend/`. From
`backend/`, install `requirements.txt` into an activated Python virtual
environment. Then run the checks from the indicated directories.

| Directory | Command |
| --- | --- |
| `backend/` | `python -B -m unittest discover -s tests -v` |
| `frontend/` | `npm test` |
| `frontend/` | `npm run lint` |
| `frontend/` | `npm run build` |

The Python `-B` option prevents new bytecode writes. The frontend build uses
the existing Vite configuration. The tests use a separate Vitest configuration.

## Coverage

- Flask's test client exercises health, CORS, multipart uploads for all four
  supported formats, unsupported and empty files, malformed documents, both
  upload size limits, and the extraction word cap. The fixtures are generated
  in memory.
- Both generation routes are tested with the default count and explicit 5, 10,
  and 15 counts, success envelopes, malformed requests, and provider failures.
  Tests inject fake providers or replace the legacy OpenAI client factory or
  the route's generation function. Factory tests cover legacy compatibility
  and Groq selection. Groq API tests use an in-memory HTTP transport to inspect
  requests, validate both response types, and check sanitized errors with zero
  retries or fallback. The separate live smoke command is documented in the
  [README](../../README.md#inference-configuration).
- Standalone validators cover exact counts, item fields and types, blank values,
  duplicate questions and options, and quiz answer matching. Mocked OpenAI
  completions exercise JSON fences, malformed and truncated output, and the
  stable HTTP 502 response for invalid output.
- The frontend tests exercise the landing CTA, direct public dashboard access,
  legacy URL redirects, file selection and validation, upload states, generation
  payloads, flashcard review, and quiz answer feedback. The study tests mock the
  Axios client module.

## Pre-existing failures and gaps

- Backend runs may emit expected parser and provider error logs and the
  pre-existing unclosed-file resource warnings. Live service and deployment
  behavior remain outside the suites.

## Step 02 verification

On Node 22.23.3 and Python 3.12.3, the backend suite passed all 15 tests and
`npm test` passed all 10 tests. `npm run build` passed with Vite 7.0.5.
`npm run lint` exited 1 with the `react-refresh/only-export-components` error
in `AuthContext.jsx` recorded in [Step 01](BASELINE.md). With the mocked
Supabase session, confirmed logout reached `/login` despite the dashboard's
request to navigate to `/`. Step 04 removed the obsolete auth code.
