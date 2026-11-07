# Axiom - Autonomous Code Generator & Test Runner

Axiom generates Python code from a plain-English task description, runs it against your test cases in a separate Python process, and repairs it once if the tests fail.

Generative AI Mini-Project (Track B) - Problem Statement P23 - Krish Walecha (Roll No. 23)

**Live app:** https://axiom-code-generator.vercel.app
**Backend API:** https://genaiproj-production.up.railway.app (`GET /api/health`)

## What it does

1. You describe a task and provide test cases (the app can also generate test cases for you).
2. Axiom streams a first candidate solution, generates a second one, and picks the better candidate using CodeBERT semantic similarity (with a token-frequency fallback).
3. It runs the tests against the picked candidate in a separate Python process (stripped environment, 8-second timeout).
4. If any test fails, it sends the error output back to the model for one repair attempt, then re-runs the tests.
5. Before returning the result, it scans the final code with Bandit for unsafe calls (`eval`, `exec`, `subprocess`, etc.).

Note: the repair loop trusts your expected values. If a test's expected value is wrong, the repair will bend the code to pass the wrong test - so the tests themselves must be correct.

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, Monaco Editor
- **Backend:** FastAPI (Python), Server-Sent Events for streaming
- **Model:** `openai/gpt-oss-120b` served through the Groq API
- **Ranking:** Microsoft CodeBERT embeddings (Hugging Face inference API, with a local token-frequency fallback)
- **Test execution:** separate Python subprocess (`python -I`) with stripped environment variables and an 8-second timeout
- **Security:** Bandit static analysis

## Run it locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
GROQ_API_KEY=your_groq_api_key_here
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on http://localhost:5173 and calls the backend at `http://127.0.0.1:8000` by default. To point it at another backend, set `VITE_API_URL` in a frontend `.env` file.

## API endpoints

- `GET /api/health` - health check
- `POST /api/generate/tests` - body `{task, function_name, model?}`; returns 5 generated test cases as JSON
- `POST /api/generate/stream` - body `{task, function_name, tests, model?}`; streams pipeline events over SSE (tokens, ranking, test results, repair, done)

## Benchmark

`backend/benchmark.py` runs 15 tasks (algorithms, strings, math, plus GAN discriminator loss and VAE ELBO loss) and reports Pass@1 and pass-after-retry:

```bash
cd backend
python benchmark.py
```

Recorded results from the project run: Pass@1 73.3% (11/15), pass-after-retry 86.7% (13/15). Numbers vary per run - rerun the script to reproduce.

## Project structure

```
backend/
  main.py            FastAPI app and SSE endpoints
  core/pipeline.py   generate -> rank -> test -> repair loop
  core/llm.py        Groq client (stream + complete)
  core/ranker.py     CodeBERT candidate ranking
  core/sandbox.py    test execution in a separate process
  core/security.py   Bandit scan
  benchmark.py       15-task evaluation runner
frontend/
  src/App.jsx        main UI (editor, pipeline stages, results)
```

## Limitations

- One repair attempt max; if the repaired code still fails, the failure is returned as-is.
- The repair loop optimizes for the given tests. Wrong expected values produce wrong "passing" code.
- Bandit output is shown in the UI as a helper; it is not a proof that the code is safe.
- The test runner is not a hardened sandbox: it strips environment variables and kills runs after 8 seconds, but it does not restrict filesystem or network access. Don't run untrusted code through it on a machine with sensitive data.
- See `MODEL_CARD.md` for the full model card and responsible-AI notes.
