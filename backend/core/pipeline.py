import re
from core.llm import complete,stream
from core.sandbox import run
from core.ranker import rank
from core.security import scan
SYSTEM="You are a senior Python engineer. Return complete Python source only, no Markdown. Implement the exact function. Do not weaken tests. Avoid filesystem, network, subprocess, eval or exec."
def clean(s):
 s=re.sub(r"^```(?:python)?\s*","",s.strip());return re.sub(r"\s*```$","",s).strip()
def stream_solve(task,fn,tests,model):
 prompt=f"TASK SPECIFICATION:\n{task}\nRequired function: {fn}\nReturn executable Python code only."
 msgs=[{"role":"system","content":SYSTEM},{"role":"user","content":prompt}]
 yield {"type":"status","stage":"generating","message":"Streaming candidate 1 from Groq"}
 tokens=[]
 for t in stream(msgs,model):
  tokens.append(t);yield {"type":"token","token":t}
 first=clean("".join(tokens))
 yield {"type":"status","stage":"ranking","message":"Generating candidate 2 and ranking with CodeBERT"}
 second=clean(complete(msgs,model));ranked,note=rank(task,[first,second]);code=ranked[0]
 if code!=first:yield {"type":"code","code":code,"message":"CodeBERT selected candidate 2"}
 yield {"type":"status","stage":"testing","message":"Executing tests in isolated sandbox"}
 ok,out=run(code,fn,tests);attempts=1
 yield {"type":"test_result","passed":ok,"output":out,"attempts":attempts}
 if not ok:
  attempts=2;yield {"type":"status","stage":"repairing","message":"One repair attempt - streaming corrected code"}
  repair=f"Repair this code once. Return complete Python source only.\nTask: {task}\nFunction: {fn}\nCode:\n{code}\nTest failure:\n{out}"
  repaired=[]
  for t in stream([{"role":"system","content":SYSTEM},{"role":"user","content":repair}],model):
   repaired.append(t);yield {"type":"repair_token","token":t}
  code=clean("".join(repaired))
  yield {"type":"code","code":code,"message":"Repaired code"}
  yield {"type":"status","stage":"testing","message":"Re-running tests after repair"}
  ok,out=run(code,fn,tests);yield {"type":"test_result","passed":ok,"output":out,"attempts":attempts}
 yield {"type":"status","stage":"security","message":"Running Bandit static security scan"}
 yield {"type":"done","passed":ok,"attempts":attempts,"code":code,"output":out,"bandit":scan(code),"rank_note":note}
