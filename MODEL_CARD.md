# Model Card: Axiom Code Generator (P23)

## Model Details
- **Project Name:** P23 · Code Generator with Test Runner
- **Track:** Track B — GANs and Transformer Internals
- **Core Generative Model:** OpenAI GPT-OSS 120B / Meta Llama 3.3 70B (served via Groq LPU API)
- **Ranking / Discriminator Model:** Microsoft CodeBERT (`microsoft/codebert-base`) semantic cosine ranker
- **Security & Safety Guardrail:** Bandit AST static analysis scanner (CWE / OWASP rules)
- **Execution Sandbox:** Python 3.11 isolated subprocess runtime (`-I` mode) with environment stripping and 8-second execution watchdog

---

## Intended Use
- **Primary Use Case:** Autonomous generation of self-contained, typed, and unit-tested Python functions from natural language task specifications.
- **Self-Healing Loop:** Automated execution against test suites with single-pass error repair (`pass-after-retry`).
- **Domain Scope:** Algorithmic functions, string parsing, mathematical transformations, and deep learning modules (GAN discriminator loss, VAE ELBO loss).

---

## Architecture: 5-Unit Integration (U1–U5)

```
[User Task & Test Cases]
        │
        ▼
   [U1: Prompt Pattern] ── Spec, Constraints, Few-Shot Test Examples
        │
        ▼
   [U2: LLM Generator] ── Generates Candidate 1 (Streaming) & Candidate 2
        │
        ▼
   [U3: CodeBERT Ranker] ── Computes semantic cosine similarity; selects best candidate
        │
        ▼
   [U4: Isolated Sandbox] ── Executes hidden test cases in sandbox (including GAN/VAE tasks)
        │
    ┌───┴────────────────────────┐
 [PASS]                       [FAIL]
    │                            │
    │                   [U2: Self-Repair Retry]
    │                   Appends traceback to prompt -> Re-runs Sandbox
    │                            │
    └──────────────┬─────────────┘
                   ▼
   [U5: Bandit & License Audit] ── AST security check & MIT IP verification
                   │
                   ▼
         [Verified Solution]
```

---

## Evaluation & Metrics (15 Benchmark Tasks)
Evaluated across 15 standard and deep learning problems (including GAN/VAE loss functions):

| Metric | Score | Description |
|---|---|---|
| **Pass@1** | **73.3%** | Proportion of tasks passing on first candidate generation |
| **Pass-after-retry** | **86.7%** | Proportion of tasks passing after one automated repair attempt |
| **Repair Gain** | **+13.4%** | Net accuracy improvement from test failure feedback |
| **Security Pass Rate** | **100%** | Zero high/medium Bandit security violations across solutions |
| **Avg Latency** | **1.85s** | Total end-to-end pipeline execution time |

---

## Failure Case Analysis (Required Deliverable)
- **Failure Scenario:** Highly dynamic APIs (e.g. live weather calls) or unconstrained floating-point precision comparisons without delta thresholds (e.g., comparing `1.386294...` directly against `1.3863`).
- **Mitigation Implemented:** Test generator prompt strictly enforces numeric rounding (`round(x, 4)`) and explicit expected schema constraints.

---

## Ethical, Legal & Responsible AI Considerations
- **Licence & IP Notice:** All outputs are synthetic, clean-room generations licensed under the open-source **MIT Licence**.
- **Security Guardrail:** Bandit static analysis prevents injection of `eval()`, `exec()`, `os.system()`, or arbitrary subprocess spawning.
- **Data Privacy:** User input is not retained for training. API keys are strictly configured via server environment variables, never committed to git.
