# P23 — Groq Code Generator (Full Stack)

## Stack
React + Vite + Tailwind CSS + Monaco Editor; FastAPI; Groq; CodeBERT; Docker; Bandit.

## Backend
```bash
cd backend
python -m venv .venv
# activate the venv
pip install -r requirements.txt
cp .env.example .env
# Set GROQ_API_KEY in backend/.env
docker pull python:3.11-slim
uvicorn main:app --reload --port 8000
```

## Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

Optional `frontend/.env`: `VITE_API_URL=http://localhost:8000`.

## Streaming
Groq token chunks are sent to the browser through Server-Sent Events and rendered live in Monaco. Candidate 1 streams; candidate 2 is generated, then CodeBERT ranks both. The selected candidate runs in Docker. One repair attempt streams if tests fail.

## Limitations
CodeBERT similarity is a relevance heuristic, not proof of correctness. Docker is a mitigation, not a complete security boundary. The JSON test runner supports function tasks, not full GAN/VAE training jobs; those need a separate ML workload environment. Bandit is static analysis, not a safety proof. Review code provenance and applicable licences before redistribution.
