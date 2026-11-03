import subprocess,sys,tempfile
from pathlib import Path
def scan(code):
 try:
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"generated.py";p.write_text(code,encoding="utf-8")
   r=subprocess.run([sys.executable,"-m","bandit","-q",str(p)],capture_output=True,text=True,timeout=15,encoding="utf-8",errors="replace")
   return (r.stdout+r.stderr).strip() or "No Bandit findings."
 except Exception as e:return f"Bandit unavailable: {e}"
