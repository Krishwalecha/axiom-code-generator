import json
from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from core.pipeline import stream_solve
from core.llm import complete
load_dotenv()
app=FastAPI(title="Axiom Code Generator API")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])

class Request(BaseModel):
    task:str=Field(min_length=8,max_length=8000)
    function_name:str=Field(min_length=1,max_length=100)
    tests:list[dict[str,Any]]=Field(min_length=1,max_length=100)
    model:str="openai/gpt-oss-120b"

class TestGenRequest(BaseModel):
    task:str=Field(min_length=8,max_length=8000)
    function_name:str=Field(min_length=1,max_length=100)
    model:str="openai/gpt-oss-120b"

@app.get("/api/health")
def health(): return {"status":"ok"}

@app.post("/api/generate/tests")
def generate_tests(req:TestGenRequest):
    prompt=(
        f"Generate 4-6 test cases for this Python function as a JSON array.\n"
        f"Task: {req.task}\n"
        f"Function name: {req.function_name}\n\n"
        f"Each test must be an object with \"args\" (array of positional arguments) and \"expected\" (the expected return value).\n"
        f"Return ONLY the JSON array, no markdown, no explanation.\n"
        f"Example format: [{{\"args\": [\"hello\"], \"expected\": true}}]"
    )
    msgs=[
        {"role":"system","content":"You are a test case generator. Return ONLY valid JSON arrays. No markdown fences, no explanation."},
        {"role":"user","content":prompt}
    ]
    raw=complete(msgs,req.model)
    # Strip markdown fences if present
    import re
    raw=re.sub(r"^```(?:json)?\s*","",raw.strip())
    raw=re.sub(r"\s*```$","",raw).strip()
    try:
        tests=json.loads(raw)
        if not isinstance(tests,list):
            raise ValueError("Not a list")
        return {"tests":tests}
    except Exception:
        return {"tests":[],"error":"Failed to parse generated tests","raw":raw}

@app.post("/api/generate/stream")
def generate(req:Request):
    def events():
        try:
            for event in stream_solve(req.task,req.function_name,req.tests,req.model):
                yield "data: "+json.dumps(event,ensure_ascii=False)+"\n\n"
        except Exception as e:
            yield "data: "+json.dumps({"type":"error","message":str(e)})+"\n\n"
    return StreamingResponse(events(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})
