import json, os, subprocess, sys, tempfile
from pathlib import Path

RUNNER = r"""
import importlib.util, json, sys, traceback

# Load the generated code
spec = importlib.util.spec_from_file_location('solution', sys.argv[2])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# Load test cases
with open(sys.argv[3], 'r', encoding='utf-8') as f:
    tests = json.load(f)

# Get the target function
fn_name = sys.argv[1]
if not hasattr(module, fn_name):
    print(f"Error: Function '{fn_name}' not found in generated code.")
    sys.exit(1)

fn = getattr(module, fn_name)
errors = []

for i, t in enumerate(tests, 1):
    try:
        got = fn(*t.get('args', []), **t.get('kwargs', {}))
        expected = t['expected']
        if got != expected:
            errors.append(f"Test {i}: expected {expected!r}, got {got!r}")
    except Exception:
        errors.append(f"Test {i}: " + traceback.format_exc(limit=2))

if errors:
    print("\n".join(errors))
    sys.exit(1)

print(f"PASS: {len(tests)} tests")
"""

def run(code: str, fn: str, tests: list, timeout: int = 8):
    """
    Executes generated code against tests in an isolated Python subprocess.
    Does not require Docker, safe for free cloud hosting (Render, Railway, etc.).
    """
    with tempfile.TemporaryDirectory() as d:
        p = Path(d)
        sol_file = p / "solution.py"
        test_file = p / "tests.json"
        runner_file = p / "runner.py"

        sol_file.write_text(code, encoding="utf-8")
        test_file.write_text(json.dumps(tests, ensure_ascii=False), encoding="utf-8")
        runner_file.write_text(RUNNER, encoding="utf-8")

        # Strip environment variables so generated code cannot read sensitive keys like GROQ_API_KEY
        safe_env = {
            "PYTHONIOENCODING": "utf-8",
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", "")  # Needed on Windows
        }

        # Use python -I (isolated mode): ignores PYTHONPATH, user site-packages, and env variables
        cmd = [
            sys.executable,
            "-I",
            str(runner_file),
            fn,
            str(sol_file),
            str(test_file)
        ]

        try:
            r = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace",
                env=safe_env,
                cwd=str(p)
            )
            output = (r.stdout + r.stderr).strip()
            return r.returncode == 0, output
        except subprocess.TimeoutExpired:
            return False, "TIMEOUT: Execution exceeded 8 second limit (possible infinite loop)."
        except Exception as e:
            return False, f"Execution failed: {str(e)}"
