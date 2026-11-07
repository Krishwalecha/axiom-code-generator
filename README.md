# Axiom · P23 Code Generator with Test Runner

> **Generative AI Mini-Project (Track B: GANs & Transformer Internals)**  
> **Problem Statement P23:** Generate Python from a task description, test it, and repair it once on failure.

[![Live App](https://img.shields.io/badge/Live_App-Vercel-black?logo=vercel)](https://axiom-code-generator.vercel.app/)
[![Backend](https://img.shields.io/badge/API_Server-Railway-purple?logo=railway)](https://genaiproj-production.up.railway.app/api/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Live Demo & Deployment
- **Live Frontend Application:** [https://axiom-code-generator.vercel.app/](https://axiom-code-generator.vercel.app/)
- **Live Backend API (Railway):** [https://genaiproj-production.up.railway.app](https://genaiproj-production.up.railway.app)
- **Health Check Endpoint:** [https://genaiproj-production.up.railway.app/api/health](https://genaiproj-production.up.railway.app/api/health)

---

## 📑 Syllabus Unit Coverage (U1–U5 Mapping)

| Unit | Syllabus Area | Implementation in P23 |
|---|---|---|
| **U1** | Foundations of Generative AI | Structured prompt engineering pattern containing **Specification**, **Constraints**, and **Few-Shot Test Examples** (`backend/core/pipeline.py`). |
| **U2** | GANs & LLMs | Dual candidate generation via Groq streaming; automated **single retry with test error feedback** on failure (`pass-after-retry`). |
| **U3** | GPT, BERT & Multimodal | GPT-family generator paired with **Microsoft CodeBERT** semantic cosine similarity ranker (`backend/core/ranker.py`). |
| **U4** | Tools & Generation | Isolated sandbox execution runtime (`backend/core/sandbox.py`) supporting general algorithms and **GAN/VAE loss writing tasks** (Minimax GAN loss, VAE ELBO loss). |
| **U5** | Responsible AI | Static security scan with **Bandit**, clean-room **MIT licence** verification, zero credential leakage, and full **Model Card** (`MODEL_CARD.md`). |

---

## 📊 Benchmark Evaluation (15 Canonical Tasks)

Run the included benchmark suite:
```bash
python backend/benchmark.py
```

### Empirical Results Summary:

| Metric | Score | Note |
|---|---|---|
| **Pass@1** | **73.3%** (11/15) | Candidate passed all tests on first try |
| **Pass-after-retry** | **86.7%** (13/15) | Passed after 1-step automated repair loop |
| **Accuracy Gain from Repair** | **+13.4%** | Measured performance improvement |
| **Bandit Security Violations** | **0** (100% clean) | Clean AST security audits |
| **Average Latency** | **1.85s** | End-to-end execution time per task |

### Detailed 15-Task Matrix:

| Task ID | Task Description | Category | Pass@1 | Pass-after-retry |
|---|---|---|---|---|
| 1 | Prime Number Check | Numeric | PASSED | PASSED |
| 2 | Palindrome String | String | PASSED | PASSED |
| 3 | Two Sum Problem | Data Structures | PASSED | PASSED |
| 4 | Fibonacci Calculation | Algorithm | PASSED | PASSED |
| 5 | Factorial Validation | Math / Exception | PASSED | PASSED |
| 6 | Reverse Words in Sentence | String | PASSED | PASSED |
| 7 | Valid Anagram | Hash Map | PASSED | PASSED |
| 8 | Binary Search | Algorithm | FAILED | PASSED (Repaired) |
| 9 | Merge Sorted Lists | Two-pointer | PASSED | PASSED |
| 10 | Matrix Transposition | 2D Arrays | PASSED | PASSED |
| 11 | **VAE ELBO Loss (U4)** | Deep Learning / VAE | FAILED | PASSED (Repaired) |
| 12 | **GAN Discriminator Loss (U4)** | Deep Learning / GAN | PASSED | PASSED |
| 13 | Softmax Probabilities | Math / Vectors | PASSED | PASSED |
| 14 | Cosine Similarity | Linear Algebra | PASSED | PASSED |
| 15 | Balanced Brackets | Stack | PASSED | PASSED |

---

## 🛠️ Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🛡️ Security & Sandbox Architecture
- **Environment Stripping:** Sandbox subprocess runs with an empty environment, preventing code from reading server credentials (such as `GROQ_API_KEY`).
- **Watchdog Timeout:** Hard 8-second execution timeout prevents denial-of-service via infinite loops.
- **Isolated Execution:** Runs with Python's isolated flag (`python -I`) ignoring external environment variables and user site-packages.
- **Bandit Static Analysis:** Scans AST for dangerous function calls (`eval`, `exec`, `subprocess`, `shell`).

---

## 📄 Licence & Attribution
Licensed under the [MIT Licence](LICENSE). Developed as part of the Generative AI Coursework Assessment (Mini-Project P23).
