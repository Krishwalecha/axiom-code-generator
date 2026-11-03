import os
from groq import Groq
def get_client():
    key=os.getenv("GROQ_API_KEY")
    if not key: raise RuntimeError("Set GROQ_API_KEY in backend/.env")
    return Groq(api_key=key)
def complete(messages,model):
    r=get_client().chat.completions.create(model=model,messages=messages,temperature=.15)
    return r.choices[0].message.content or ""
def stream(messages,model):
    r=get_client().chat.completions.create(model=model,messages=messages,temperature=.15,stream=True)
    for c in r:
        token=c.choices[0].delta.content
        if token: yield token
