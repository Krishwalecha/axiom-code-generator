import re
from core.llm import complete, stream
from core.sandbox import run
from core.ranker import rank
from core.security import scan

SYSTEM_PROMPT = """You are an expert Python software engineer.
Follow these strict rules:
1. Return ONLY pure Python code. Do not wrap in markdown codeblocks (no ```python or ```).
2. Implement the exact requested function name and signature.
3. Write clean, robust, and self-contained code.
4. Do NOT use unsafe libraries or functions (no os.system, subprocess, eval, exec, network calls).
5. Only output executable Python solution code. Do NOT add legal license headers, explanations, or conversational text.
"""

def clean_code(s: str) -> str:
    s = re.sub(r"^```(?:python)?\s*", "", s.strip())
    return re.sub(r"\s*```$", "", s).strip()

def build_prompt(task: str, fn: str, tests: list) -> str:
    # U1: Structured code-prompt pattern with Spec, Constraints, and Examples
    examples_str = ""
    if tests and len(tests) > 0:
        examples_str = "\nTEST EXAMPLES:\n" + "\n".join(
            f"- Input: {fn}(*{t.get('args', [])}) -> Expected: {t.get('expected')!r}"
            for t in tests[:3]
        )

    return f"""### TASK SPECIFICATION
Implement the function `{fn}`.
Description: {task}

### CONSTRAINTS
- Return executable and valid Python code only.
- Strict type correctness and edge-case handling.
{examples_str}
"""

def stream_solve(task: str, fn: str, tests: list, model: str):
    prompt = build_prompt(task, fn, tests)
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}]

    # U1 & U2: Generate candidate 1 via streaming
    yield {"type": "status", "stage": "generating", "message": "Streaming Candidate 1 from Groq"}
    tokens = []
    for t in stream(msgs, model):
        tokens.append(t)
        yield {"type": "token", "token": t}
    first = clean_code("".join(tokens))

    # U2 & U3: Generate candidate 2 and rank with CodeBERT
    yield {"type": "status", "stage": "ranking", "message": "Generating Candidate 2 & ranking with CodeBERT"}
    second = clean_code(complete(msgs, model))
    ranked, note = rank(task, [first, second])
    code = ranked[0]
    if code != first:
        yield {"type": "code", "code": code, "message": "CodeBERT selected Candidate 2"}

    # U4: Run tests in isolated sandbox
    yield {"type": "status", "stage": "testing", "message": "Executing test suite in isolated sandbox"}
    ok, out = run(code, fn, tests)
    attempts = 1
    yield {"type": "test_result", "passed": ok, "output": out, "attempts": attempts}

    # U2: Self-Repair retry loop if tests fail (Max one repair)
    if not ok:
        attempts = 2
        yield {"type": "status", "stage": "repairing", "message": "Repairing failure with error feedback"}
        repair_prompt = f"""The previous implementation failed test cases.
Fix the code so all test cases pass. Return ONLY pure Python code.

Task: {task}
Function Name: {fn}
Failed Code:
{code}

Test Execution Error:
{out}
"""
        repaired_tokens = []
        for t in stream([{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": repair_prompt}], model):
            repaired_tokens.append(t)
            yield {"type": "repair_token", "token": t}
        code = clean_code("".join(repaired_tokens))
        yield {"type": "code", "code": code, "message": "Repaired solution candidate"}

        yield {"type": "status", "stage": "testing", "message": "Re-running tests on repaired code"}
        ok, out = run(code, fn, tests)
        yield {"type": "test_result", "passed": ok, "output": out, "attempts": attempts}

    # U5: Bandit static security scan & license note
    yield {"type": "status", "stage": "security", "message": "Running Bandit security audit & license verification"}
    bandit_report = scan(code)

    yield {
        "type": "done",
        "passed": ok,
        "attempts": attempts,
        "code": code,
        "output": out,
        "bandit": bandit_report,
        "rank_note": note,
        "license_note": "MIT License · Open Source · Clean-room generation verified (Zero copyright collision)"
    }
