# SmartCards regression tests

The Step 02 suites exercise the existing application. Test data is synthetic,
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
  Tests replace the OpenAI client factory or the route's generation function.
- The frontend tests exercise the landing CTA, authenticated and signed-out
  route redirects, logout, file selection and validation, upload states,
  generation payloads, flashcard review, and quiz answer feedback. Supabase and
  the Axios client module are replaced with mocks.

## Pre-existing failures and gaps

- `npm run lint` reports `react-refresh/only-export-components` at
  `frontend/src/context/AuthContext.jsx:5:14`. This is the same failure recorded
  in [Step 01](BASELINE.md).
- With the mocked Supabase session, confirmed logout lands on `/login` even
  though the dashboard requests navigation to `/`. The suite records the
  observed guard redirect. Live logout timing was outside the test run.
- Generation routes currently assume the JSON root is an object. A non-object
  body can yield HTTP 500. The API also lacks count, text-type, and provider
  output schema validation. The tests cover the supported count choices and
  current error responses for malformed JSON and missing text. They leave
  future validation expectations for the steps that change those contracts.
- Backend runs may emit expected parser and provider error logs and the
  pre-existing unclosed-file resource warnings. Live service and deployment
  behavior remain outside the suites.

## Step 02 verification

On Node 22.23.3 and Python 3.12.3, the backend suite passed all 15 tests and
`npm test` passed all 10 tests. `npm run build` passed with Vite 7.0.5.
`npm run lint` exited 1 with the single existing AuthContext error above.
