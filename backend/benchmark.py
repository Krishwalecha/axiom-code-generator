"""
P23 Code Generator Benchmark Runner
Measures pass@1 and pass-after-retry metrics on 15 canonical tasks
Covering Unit 1 to Unit 5 syllabus requirements (including GAN/VAE tasks).
"""

import time
import json
from core.pipeline import stream_solve

TASKS = [
    {
        "id": 1,
        "name": "Prime Number Check",
        "task": "Write is_prime(n) that returns True if n is prime, False otherwise. Numbers < 2 are not prime.",
        "fn": "is_prime",
        "tests": [{"args": [2], "expected": True}, {"args": [9], "expected": False}, {"args": [1], "expected": False}, {"args": [17], "expected": True}]
    },
    {
        "id": 2,
        "name": "Palindrome String",
        "task": "Write is_palindrome(s) returning True if string s is a palindrome ignoring case and non-alphanumeric chars.",
        "fn": "is_palindrome",
        "tests": [{"args": ["racecar"], "expected": True}, {"args": ["A man a plan a canal Panama"], "expected": True}, {"args": ["hello"], "expected": False}]
    },
    {
        "id": 3,
        "name": "Two Sum Indices",
        "task": "Write two_sum(nums, target) that returns the pair of indices of numbers that add to target.",
        "fn": "two_sum",
        "tests": [{"args": [[2, 7, 11, 15], 9], "expected": [0, 1]}, {"args": [[3, 2, 4], 6], "expected": [1, 2]}]
    },
    {
        "id": 4,
        "name": "Fibonacci Sequence",
        "task": "Write fib(n) that returns the n-th Fibonacci number (0-indexed: fib(0)=0, fib(1)=1).",
        "fn": "fib",
        "tests": [{"args": [0], "expected": 0}, {"args": [1], "expected": 1}, {"args": [7], "expected": 13}, {"args": [10], "expected": 55}]
    },
    {
        "id": 5,
        "name": "Factorial Calculation",
        "task": "Write factorial(n) returning factorial of non-negative integer n. Raise ValueError if n < 0.",
        "fn": "factorial",
        "tests": [{"args": [0], "expected": 1}, {"args": [5], "expected": 120}, {"args": [7], "expected": 5040}]
    },
    {
        "id": 6,
        "name": "Reverse Words in String",
        "task": "Write reverse_words(s) that reverses the order of words in string s with single space separation.",
        "fn": "reverse_words",
        "tests": [{"args": ["the sky is blue"], "expected": "blue is sky the"}, {"args": ["  hello world  "], "expected": "world hello"}]
    },
    {
        "id": 7,
        "name": "Valid Anagram",
        "task": "Write is_anagram(s, t) that returns True if string t is an anagram of s, False otherwise.",
        "fn": "is_anagram",
        "tests": [{"args": ["anagram", "nagaram"], "expected": True}, {"args": ["rat", "car"], "expected": False}]
    },
    {
        "id": 8,
        "name": "Binary Search",
        "task": "Write binary_search(arr, target) that returns the index of target in sorted arr, or -1 if absent.",
        "fn": "binary_search",
        "tests": [{"args": [[-1, 0, 3, 5, 9, 12], 9], "expected": 4}, {"args": [[-1, 0, 3, 5, 9, 12], 2], "expected": -1}]
    },
    {
        "id": 9,
        "name": "Merge Sorted Lists",
        "task": "Write merge_sorted(l1, l2) returning a single merged sorted list from two pre-sorted lists.",
        "fn": "merge_sorted",
        "tests": [{"args": [[1, 2, 4], [1, 3, 4]], "expected": [1, 1, 2, 3, 4, 4]}, {"args": [[], [0]], "expected": [0]}]
    },
    {
        "id": 10,
        "name": "Matrix Transpose",
        "task": "Write transpose(matrix) that returns the transpose of a 2D matrix.",
        "fn": "transpose",
        "tests": [{"args": [[[1, 2, 3], [4, 5, 6]]], "expected": [[1, 4], [2, 5], [3, 6]]}, {"args": [[[1, 2], [3, 4]]], "expected": [[1, 3], [2, 4]]}]
    },
    {
        "id": 11,
        "name": "VAE ELBO Loss (U4)",
        "task": "Write vae_loss(recon, x, mu, logvar) that computes ELBO loss: binary cross-entropy reconstruction plus KL divergence: -0.5 * sum(1 + logvar - mu^2 - exp(logvar)). Round to 4 decimals.",
        "fn": "vae_loss",
        "tests": [{"args": [[0.5, 0.5], [1.0, 0.0], [0.0, 0.0], [0.0, 0.0]], "expected": 1.3863}]
    },
    {
        "id": 12,
        "name": "GAN Discriminator Loss (U4)",
        "task": "Write gan_discriminator_loss(real_pred, fake_pred) that calculates Minimax GAN loss: -0.5 * (math.log(real_pred) + math.log(1 - fake_pred)). Round to 4 decimals.",
        "fn": "gan_discriminator_loss",
        "tests": [{"args": [0.8, 0.2], "expected": 0.2231}, {"args": [0.5, 0.5], "expected": 0.6931}]
    },
    {
        "id": 13,
        "name": "Softmax Vector",
        "task": "Write softmax(logits) that computes numerically stable softmax probabilities rounded to 4 decimals.",
        "fn": "softmax",
        "tests": [{"args": [[1.0, 2.0, 3.0]], "expected": [0.09, 0.2447, 0.6652]}]
    },
    {
        "id": 14,
        "name": "Cosine Distance",
        "task": "Write cosine_similarity(v1, v2) that returns cosine similarity between two 1D vectors rounded to 4 decimals.",
        "fn": "cosine_similarity",
        "tests": [{"args": [[1, 0, -1], [-1, -1, 0]], "expected": -0.5}, {"args": [[1, 1], [1, 1]], "expected": 1.0}]
    },
    {
        "id": 15,
        "name": "Balanced Brackets",
        "task": "Write is_balanced(s) returning True if string of brackets (), [], {} is properly matched, False otherwise.",
        "fn": "is_balanced",
        "tests": [{"args": ["()[]{}"], "expected": True}, {"args": ["(]"], "expected": False}, {"args": ["([{}])"], "expected": True}]
    }
]

def run_benchmark():
    print("=" * 80)
    print("P23 Code Generator: Benchmark Evaluation across 15 Tasks")
    print("=" * 80)

    results = []
    pass_at_1_count = 0
    pass_after_retry_count = 0

    for t in TASKS:
        print(f"\nEvaluating Task {t['id']}/15: {t['name']}...")
        t0 = time.time()
        events = list(stream_solve(t['task'], t['fn'], t['tests'], "openai/gpt-oss-120b"))
        elapsed = round(time.time() - t0, 2)

        done_event = [e for e in events if e.get("type") == "done"]
        test_events = [e for e in events if e.get("type") == "test_result"]

        if not done_event:
            print("  Failed: Execution error")
            continue

        done = done_event[0]
        # First test execution indicates pass@1
        first_pass = test_events[0]["passed"] if test_events else False
        final_pass = done["passed"]
        attempts = done["attempts"]

        if first_pass:
            pass_at_1_count += 1
        if final_pass:
            pass_after_retry_count += 1

        results.append({
            "id": t["id"],
            "name": t["name"],
            "pass@1": "PASSED" if first_pass else "FAILED",
            "pass@retry": "PASSED" if final_pass else "FAILED",
            "attempts": attempts,
            "latency": f"{elapsed}s",
            "bandit": "Clean" if "No Bandit findings" in done.get("bandit", "") else "Flagged"
        })

    # Summary table
    print("\n" + "=" * 80)
    print("BENCHMARK RESULTS TABLE (Copy to Report)")
    print("=" * 80)
    print("| Task ID | Task Name | Pass@1 | Pass-after-retry | Attempts | Latency | Security (Bandit) |")
    print("|---|---|---|---|---|---|---|")
    for r in results:
        print(f"| {r['id']} | {r['name']} | {r['pass@1']} | {r['pass@retry']} | {r['attempts']} | {r['latency']} | {r['bandit']} |")

    pass_at_1_pct = round((pass_at_1_count / len(TASKS)) * 100, 1)
    pass_retry_pct = round((pass_after_retry_count / len(TASKS)) * 100, 1)

    print("\n" + "=" * 80)
    print("AGGREGATE SUMMARY METRICS")
    print("=" * 80)
    print(f"Total Tasks Evaluated:    {len(TASKS)}")
    print(f"Pass@1 Accuracy:          {pass_at_1_pct}% ({pass_at_1_count}/{len(TASKS)})")
    print(f"Pass-after-retry Accuracy: {pass_retry_pct}% ({pass_after_retry_count}/{len(TASKS)})")
    print(f"Accuracy Gain from Repair: +{round(pass_retry_pct - pass_at_1_pct, 1)}%")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmark()
