import {useState,useCallback} from "react";
import Editor from "@monaco-editor/react";
import {Code2,Sparkles,Play,Copy,FlaskConical,Terminal,ShieldCheck,LoaderCircle,CheckCircle2,XCircle,Cpu,ChevronDown,Wand2,PenLine} from "lucide-react";

const API=import.meta.env.VITE_API_URL||"http://localhost:8000";

export default function App(){
 const [task,setTask]=useState("Write a function is_prime(n) that returns True if n is a prime number and False otherwise. Numbers less than 2 are not prime.");
 const [fn,setFn]=useState("is_prime");
 const [tests,setTests]=useState("");
 const [model,setModel]=useState("openai/gpt-oss-120b");
 const [testMode,setTestMode]=useState("auto"); // "auto" or "manual"
 const [genningTests,setGenningTests]=useState(false);

 const [code,setCode]=useState("");
 const [output,setOutput]=useState("Ready. Describe a task and hit generate.");
 const [stage,setStage]=useState("idle");
 const [label,setLabel]=useState("Ready");
 const [passed,setPassed]=useState(null);
 const [attempts,setAttempts]=useState(0);
 const [bandit,setBandit]=useState("");
 const [rankNote,setRankNote]=useState("");
 const [error,setError]=useState("");
 const [copied,setCopied]=useState(false);

 const busy=["generating","ranking","testing","repairing","security"].includes(stage);

 const autoGenerateTests=useCallback(async()=>{
  if(!task.trim()||!fn.trim()){setError("Enter task and function name first.");return;}
  if(/\s/.test(fn.trim())){setError("Function names cannot have spaces. Use snake_case (e.g. "+fn.trim().replace(/\s+/g,"_")+").");return;}
  if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fn.trim())){setError("Invalid function name. Use standard Python naming (e.g. is_prime, calculate_sum).");return;}
  setGenningTests(true);setError("");
  try{
   const res=await fetch(`${API}/api/generate/tests`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task,function_name:fn,model})});
   const data=await res.json();
   if(data.tests&&data.tests.length>0){
    setTests(JSON.stringify(data.tests,null,2));
   } else {
    setError(data.error||"Could not generate tests. Try writing them manually.");
    if(data.raw)setTests(data.raw);
   }
  }catch(e){setError("Failed to generate tests: "+e.message);}
  finally{setGenningTests(false);}
 },[task,fn,model]);

 async function run(){
  let testList;
  if(testMode==="auto"&&!tests.trim()){
   // Auto-generate first
   setGenningTests(true);setError("");
   try{
    const res=await fetch(`${API}/api/generate/tests`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task,function_name:fn,model})});
    const data=await res.json();
    if(data.tests&&data.tests.length>0){
     testList=data.tests;setTests(JSON.stringify(data.tests,null,2));
    } else {setError("Could not auto-generate tests. Switch to manual mode.");setGenningTests(false);return;}
   }catch(e){setError("Failed: "+e.message);setGenningTests(false);return;}
   setGenningTests(false);
  } else {
   try{testList=JSON.parse(tests);if(!Array.isArray(testList)||!testList.length)throw Error("Add at least one test case.");}catch(e){setError("Invalid test JSON: "+e.message);return;}
  }
  if(!task.trim()||!fn.trim()){setError("Task and function name are required.");return;}
  if(/\s/.test(fn.trim())){setError("Function names cannot have spaces. Use snake_case (e.g. "+fn.trim().replace(/\s+/g,"_")+").");return;}
  if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fn.trim())){setError("Invalid function name. Use standard Python naming (e.g. is_prime, calculate_sum).");return;}
  setError("");setPassed(null);setAttempts(0);setBandit("");setRankNote("");setCode("");setOutput("Connecting...");setStage("generating");setLabel("Generating");
  try{
   const res=await fetch(`${API}/api/generate/stream`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task,function_name:fn,tests:testList,model})});
   if(!res.ok||!res.body)throw Error(`API error ${res.status}`);
   const reader=res.body.getReader(),decoder=new TextDecoder();let buf="",first="",repair="";
   while(true){const{value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const frames=buf.split("\n\n");buf=frames.pop()||"";
    for(const frame of frames){const line=frame.split("\n").find(x=>x.startsWith("data: "));if(!line)continue;const e=JSON.parse(line.slice(6));
     if(e.type==="token"){first+=e.token;setCode(first);}
     if(e.type==="repair_token"){repair+=e.token;setCode(repair);}
     if(e.type==="code"){setCode(e.code);setOutput(e.message||"Candidate selected");}
     if(e.type==="status"){setStage(e.stage);setLabel(e.message);}
     if(e.type==="test_result"){setPassed(e.passed);setAttempts(e.attempts);setOutput(e.output);}
     if(e.type==="done"){setCode(e.code);setPassed(e.passed);setAttempts(e.attempts);setOutput(e.output);setBandit(e.bandit);setRankNote(e.rank_note);setStage("done");setLabel(e.passed?"All tests passed":"Finished");}
     if(e.type==="error")throw Error(e.message);
    }
   }
  }catch(e){setStage("error");setLabel("Error");setError(e.message);}
 }

 async function copy(){await navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1200);}

 const steps=[["generating","Generate"],["ranking","Rank"],["testing","Test"],["repairing","Repair"],["security","Scan"]];
 const idx=steps.findIndex(x=>x[0]===stage);
 const complete=(i)=>stage==="done"||idx>i||(["ranking","testing","repairing","security"].includes(stage)&&i===0)||(["testing","repairing","security"].includes(stage)&&i===1)||(["repairing","security"].includes(stage)&&i===2);
 const testCount=(()=>{try{return JSON.parse(tests).length}catch{return 0}})();

 return <div className="shell">
  {/* ── Header ── */}
  <header className="topbar">
   <div className="topbar-left">
    <div className="logo-icon"><Code2 size={14} strokeWidth={2.5}/></div>
    <span className="logo-text">Axiom</span>
    <span className="logo-sep"/>
    <span className="logo-sub">Code Generator</span>
   </div>
   <div className="topbar-right">
    <div className="status-pill"><span className="dot green"/>Online</div>
    <div className="avatar">K</div>
   </div>
  </header>

  {/* ── Body ── */}
  <div className="body">

   {/* ── Sidebar ── */}
   <aside className="sidebar">
    <div className="sb-scroll">

     <div className="sb-group">
      <div className="sb-head">
       <div className="sb-title"><Sparkles size={13}/>Configure</div>
       <span className="sb-tag">INPUT</span>
      </div>
      <label className="lbl">Task description</label>
      <textarea className="inp textarea" rows={4} value={task} onChange={e=>{setTask(e.target.value);if(testMode==="auto")setTests("");}} placeholder="Describe what your function should do..."/>
     </div>

     <div className="sb-group">
      <div className="sb-row">
       <div className="sb-col">
        <label className="lbl">Function name <span className="lbl-tag">no spaces</span></label>
        <input className="inp mono" value={fn} placeholder="e.g. is_prime" onChange={e=>{
          const cleaned = e.target.value.replace(/\s+/g, '_');
          setFn(cleaned);
          if(testMode==="auto")setTests("");
        }}/>
       </div>
       <div className="sb-col">
        <label className="lbl">Model</label>
        <div className="sel-wrap">
         <select className="inp sel" value={model} onChange={e=>setModel(e.target.value)}>
          <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
          <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
          <option value="qwen/qwen3-32b">Qwen 3 32B</option>
         </select>
         <ChevronDown size={11} className="sel-icon"/>
        </div>
       </div>
      </div>
     </div>

     <div className="sb-sep"/>

     <div className="sb-group">
      <div className="sb-head">
       <div className="sb-title"><FlaskConical size={13}/>Test cases</div>
       <div className="test-toggle">
        <button className={`toggle-btn ${testMode==="auto"?"active":""}`} onClick={()=>setTestMode("auto")}><Wand2 size={10}/>Auto</button>
        <button className={`toggle-btn ${testMode==="manual"?"active":""}`} onClick={()=>setTestMode("manual")}><PenLine size={10}/>Manual</button>
       </div>
      </div>

      {testMode==="auto"?(
       <div className="auto-tests">
        {tests.trim()?<>
         <div className="auto-preview mono">{tests}</div>
         <div className="auto-actions">
          <span className="test-count">{testCount} test{testCount!==1?"s":""} generated</span>
          <div style={{display:"flex",gap:"6px"}}>
           <button className="btn-regen" onClick={()=>setTests("")}>Reset</button>
           <button className="btn-regen" onClick={autoGenerateTests} disabled={genningTests}>
            {genningTests?<><LoaderCircle size={11} className="spin"/>Generating...</>:<><Wand2 size={11}/>Regenerate</>}
           </button>
          </div>
         </div>
        </>:<>
         <p className="auto-hint">Tests will be auto-generated from your task description when you click generate, or:</p>
         <button className="btn-autogen" onClick={autoGenerateTests} disabled={genningTests}>
          {genningTests?<><LoaderCircle size={12} className="spin"/>Generating tests...</>:<><Wand2 size={12}/>Generate test cases now</>}
         </button>
        </>}
       </div>
      ):(
       <div className="manual-tests">
        <p className="manual-hint">JSON array — each object needs <code>args</code> and <code>expected</code></p>
        <textarea className="inp textarea tests mono" rows={5} spellCheck="false" value={tests} onChange={e=>setTests(e.target.value)} placeholder={'[\n  { "args": ["racecar"], "expected": true },\n  { "args": ["hello"], "expected": false }\n]'}/>
        {testCount>0&&<span className="test-count">{testCount} test{testCount!==1?"s":""}</span>}
       </div>
      )}
     </div>

     {error&&<div className="sb-error">{error}</div>}

     <button className="btn-run" onClick={run} disabled={busy||genningTests}>
      {busy?<><LoaderCircle className="spin" size={14}/>Working...</>:<><Play size={13} fill="currentColor"/>Generate & run tests</>}
     </button>

     <p className="sb-note"><ShieldCheck size={11}/>Secure isolation · Max one repair</p>
    </div>
   </aside>

   {/* ── Content ── */}
   <main className="content">
    <div className="editor-card">
     <div className="ed-toolbar">
      <div className="ed-tab">
       <Code2 size={13}/>
       <span className="ed-filename">solution.py</span>
       <span className="ed-lang">PYTHON</span>
      </div>
      <div className="ed-actions">
       {busy&&<span className="ed-streaming"><span className="dot green pulse-dot"/>Streaming</span>}
       <button className="btn-copy" onClick={copy} disabled={!code}>
        <Copy size={11}/>{copied?"Copied!":"Copy"}
       </button>
      </div>
     </div>
     <div className="ed-body">
      <Editor height="100%" language="python" theme="vs-dark" value={code} onChange={v=>setCode(v||"")} options={{readOnly:busy,minimap:{enabled:false},fontSize:13,lineHeight:20,fontFamily:"'JetBrains Mono',monospace",padding:{top:12},scrollBeyondLastLine:false,automaticLayout:true,wordWrap:"on",renderLineHighlight:"none",overviewRulerBorder:false,hideCursorInOverviewRuler:true,scrollbar:{vertical:'auto',horizontal:'hidden'}}}/>
     </div>
     <div className="ed-status">
      <span className="ed-status-left"><span className="dot green"/>Python 3.11</span>
      <span>{code?code.split("\n").length:0} lines</span>
      <span>UTF-8</span>
     </div>
    </div>

    <div className="results-card">
     <div className="res-header">
      <div className="res-title"><Terminal size={14}/>Execution results</div>
      <span className={`res-badge ${passed===true?"pass":passed===false?"fail":busy?"run":""}`}>
       {passed===true?<><CheckCircle2 size={11}/>PASSED</>:passed===false?<><XCircle size={11}/>FAILED</>:busy?<><LoaderCircle size={11} className="spin"/>RUNNING</>:"IDLE"}
      </span>
     </div>

     <div className="pipeline">
      {steps.map(([key,name],i)=>(
       <div className={`pip ${stage===key?"active":complete(i)?"done":""}`} key={key}>
        <span className="pip-n">{complete(i)?"✓":stage===key?<LoaderCircle size={10} className="spin"/>:i+1}</span>
        <span className="pip-label">{key==="repairing"&&passed===true?"Skipped":name}</span>
       </div>
      ))}
     </div>

     <div className="console">
      <div className="con-head"><span className="con-label">OUTPUT</span><span className="con-status">{label}</span></div>
      <pre className="con-body">{output}</pre>
     </div>

     {(rankNote||bandit)&&<div className="audit">
      {rankNote&&<div className="audit-item"><Cpu size={12}/><div><strong>CodeBERT</strong><span>{rankNote}</span></div></div>}
      {bandit&&<div className="audit-item"><ShieldCheck size={12}/><div><strong>Bandit scan</strong><span>{bandit}</span></div></div>}
     </div>}

     <div className="metrics">
      <div className="met"><span className="met-l">Attempts</span><span className="met-v">{attempts||"--"}<small> / 2</small></span></div>
      <div className="met"><span className="met-l">Tests</span><span className="met-v">{testCount||"--"}</span></div>
      <div className="met"><span className="met-l">Repair policy</span><span className="met-v met-accent">Once</span></div>
     </div>
    </div>
   </main>
  </div>

  {/* ── Footer ── */}
  <footer className="bottombar">
   <span>Axiom · Code generation research prototype</span>
   <span>Groq · CodeBERT · Sandbox · Bandit</span>
  </footer>
 </div>
}
