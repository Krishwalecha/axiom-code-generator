import ast

def rank(task, candidates):
    """
    Ranks code candidates using AST syntax validation and structural metrics.
    Lightweight, instant, and safe for cloud containers with memory limits.
    """
    if len(candidates) < 2:
        return candidates, "One candidate; ranking skipped."

    scored = []
    for c in candidates:
        try:
            tree = ast.parse(c)
            score = 10
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    score += 5
                    if ast.get_docstring(node):
                        score += 3
                elif isinstance(node, (ast.For, ast.While, ast.If)):
                    score += 1
            scored.append((score, c))
        except SyntaxError:
            scored.append((0, c))

    scored.sort(reverse=True, key=lambda x: x[0])
    return [c for _, c in scored], "AST structural validation & semantic ranking."
