import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Code2, Sparkles, Play, Copy, FlaskConical, Terminal, ShieldCheck, LoaderCircle, CheckCircle2, XCircle, Cpu, ChevronDown, Wand2, PenLine, Layers, FileCode, Check } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PRESETS = [
  {
    name: "Prime Check",
    task: "Write a function is_prime(n) that returns True if n is a prime number and False otherwise. Numbers less than 2 are not prime.",
    fn: "is_prime",
    tests: JSON.stringify([
      { args: [2], expected: true },
      { args: [9], expected: false },
      { args: [1], expected: false },
      { args: [17], expected: true }
    ], null, 2)
  },
  {
    name: "Palindrome",
    task: "Write a function is_palindrome(s) that returns True if string s is a palindrome, False otherwise. Ignore casing and non-alphanumeric characters.",
    fn: "is_palindrome",
    tests: JSON.stringify([
      { args: ["racecar"], expected: true },
      { args: ["A man a plan a canal Panama"], expected: true },
      { args: ["hello"], expected: false }
    ], null, 2)
  },
  {
    name: "VAE Loss (U4)",
    task: "Write a function vae_loss(recon_x, x, mu, logvar) that computes the VAE loss as the sum of binary cross-entropy reconstruction loss and KL-divergence: -0.5 * sum(1 + logvar - mu^2 - exp(logvar)). Return total loss rounded to 4 decimals.",
    fn: "vae_loss",
    tests: JSON.stringify([
      { args: [[0.5, 0.5], [1.0, 0.0], [0.0, 0.0], [0.0, 0.0]], expected: 1.3863 },
      { args: [[0.2, 0.8], [0.0, 1.0], [0.1, -0.1], [0.05, -0.05]], expected: 0.4578 }
    ], null, 2)
  },
  {
    name: "GAN Loss (U4)",
    task: "Write a function gan_discriminator_loss(real_pred, fake_pred) that calculates the Minimax GAN discriminator loss: -0.5 * (math.log(real_pred) + math.log(1 - fake_pred)). Return loss rounded to 4 decimals.",
    fn: "gan_discriminator_loss",
    tests: JSON.stringify([
      { args: [0.8, 0.2], expected: 0.2231 },
      { args: [0.5, 0.5], expected: 0.6931 },
      { args: [0.9, 0.1], expected: 0.1054 }
    ], null, 2)
  }
];

export default function App() {
  const [task, setTask] = useState(PRESETS[0].task);
  const [fn, setFn] = useState(PRESETS[0].fn);
  const [tests, setTests] = useState(PRESETS[0].tests);
  const [model, setModel] = useState("openai/gpt-oss-120b");
  const [testMode, setTestMode] = useState("auto");
  const [genningTests, setGenningTests] = useState(false);
  const [activePreset, setActivePreset] = useState(0);

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("Ready when you are. Choose a task preset or write your own, then hit Generate.");
  const [stage, setStage] = useState("idle");
  const [label, setLabel] = useState("Ready");
  const [passed, setPassed] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [bandit, setBandit] = useState("");
  const [rankNote, setRankNote] = useState("");
  const [licenseNote, setLicenseNote] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const busy = ["generating", "ranking", "testing", "repairing", "security"].includes(stage);

  const applyPreset = (p, idx) => {
    setActivePreset(idx);
    setTask(p.task);
    setFn(p.fn);
    setTests(p.tests);
    setError("");
  };

  const autoGenerateTests = useCallback(async () => {
    if (!task.trim() || !fn.trim()) { setError("Enter task and function name first."); return; }
    if (/\s/.test(fn.trim())) { setError("Function names cannot have spaces. Use snake_case (e.g. " + fn.trim().replace(/\s+/g, "_") + ")."); return; }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fn.trim())) { setError("Invalid function name. Use standard Python naming (e.g. is_prime, calculate_sum)."); return; }
    setGenningTests(true); setError("");
    try {
      const res = await fetch(`${API}/api/generate/tests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, function_name: fn, model }) });
      const data = await res.json();
      if (data.tests && data.tests.length > 0) {
        setTests(JSON.stringify(data.tests, null, 2));
      } else {
        setError(data.error || "Could not generate tests. Try writing them manually.");
        if (data.raw) setTests(data.raw);
      }
    } catch (e) { setError("Failed to generate tests: " + e.message); }
    finally { setGenningTests(false); }
  }, [task, fn, model]);

  async function run() {
    let testList;
    if (testMode === "auto" && !tests.trim()) {
      setGenningTests(true); setError("");
      try {
        const res = await fetch(`${API}/api/generate/tests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, function_name: fn, model }) });
        const data = await res.json();
        if (data.tests && data.tests.length > 0) {
          testList = data.tests; setTests(JSON.stringify(data.tests, null, 2));
        } else { setError("Could not auto-generate tests. Switch to manual mode."); setGenningTests(false); return; }
      } catch (e) { setError("Failed: " + e.message); setGenningTests(false); return; }
      setGenningTests(false);
    } else {
      try { testList = JSON.parse(tests); if (!Array.isArray(testList) || !testList.length) throw Error("Add at least one test case."); } catch (e) { setError("Invalid test JSON: " + e.message); return; }
    }
    if (!task.trim() || !fn.trim()) { setError("Task and function name are required."); return; }
    if (/\s/.test(fn.trim())) { setError("Function names cannot have spaces. Use snake_case (e.g. " + fn.trim().replace(/\s+/g, "_") + ")."); return; }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fn.trim())) { setError("Invalid function name. Use standard Python naming (e.g. is_prime, calculate_sum)."); return; }
    setError("");
    setPassed(null);
    setAttempts(0);
    setBandit("");
    setRankNote("");
    setLicenseNote("");
    setCode("");
    setOutput(
      "Initializing code generation pipeline...\n" +
      "Preparing task specification and test cases...\n" +
      "Connecting to AI inference engine (GPT-OSS 120B)..."
    );
    setStage("generating");
    setLabel("Initializing AI Pipeline"); try {
      const res = await fetch(`${API}/api/generate/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, function_name: fn, tests: testList, model }) });
      if (!res.ok || !res.body) throw Error(`API error ${res.status}`);
      const reader = res.body.getReader(), decoder = new TextDecoder(); let buf = "", first = "", repair = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break; buf += decoder.decode(value, { stream: true }); const frames = buf.split("\n\n"); buf = frames.pop() || "";
        for (const frame of frames) {
          const line = frame.split("\n").find(x => x.startsWith("data: ")); if (!line) continue; const e = JSON.parse(line.slice(6));
          if (e.type === "token") { first += e.token; setCode(first); }
          if (e.type === "repair_token") { repair += e.token; setCode(repair); }
          if (e.type === "code") { setCode(e.code); setOutput(e.message || "Candidate selected"); }
          if (e.type === "status") { setStage(e.stage); setLabel(e.message); }
          if (e.type === "test_result") { setPassed(e.passed); setAttempts(e.attempts); setOutput(e.output); }
          if (e.type === "done") {
            setCode(e.code);
            setPassed(e.passed);
            setAttempts(e.attempts);
            setOutput(e.output);
            setBandit(e.bandit);
            setRankNote(e.rank_note);
            setLicenseNote(e.license_note);
            setStage("done");
            setLabel(e.passed ? "All tests passed" : "Execution completed");
          }
          if (e.type === "error") throw Error(e.message);
        }
      }
    } catch (e) { setStage("error"); setLabel("Execution failed"); setError(e.message); }
  }

  async function copy() { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  const steps = [["generating", "Generate"], ["ranking", "Rank"], ["testing", "Test"], ["repairing", "Repair"], ["security", "Audit"]];
  const idx = steps.findIndex(x => x[0] === stage);
  const complete = (i) => stage === "done" || idx > i || (["ranking", "testing", "repairing", "security"].includes(stage) && i === 0) || (["testing", "repairing", "security"].includes(stage) && i === 1) || (["repairing", "security"].includes(stage) && i === 2);
  const testCount = (() => { try { return JSON.parse(tests).length } catch { return 0 } })();

  return <div className="shell">
    {/* ── Top Navbar ── */}
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-badge">
          <Code2 size={15} strokeWidth={2.4} />
        </div>
        <div className="brand-meta">
          <span className="brand-name">Axiom</span>
        </div>
        <span className="brand-divider" />
        <span className="brand-subtitle">Autonomous Code Generator & Test Runner</span>
      </div>
      <div className="topbar-right">
        <div className="live-status">
          <span className="live-dot" />
          <span className="live-label">SYSTEM READY</span>
        </div>
        <div className="model-chip">
          <Cpu size={12} />
          <span>{model.split("/").pop()}</span>
        </div>
      </div>
    </header>

    {/* ── Main Workspace ── */}
    <div className="body">

      {/* ── Left Sidebar (Controls) ── */}
      <aside className="sidebar">
        <div className="sb-scroll">

          {/* Presets */}
          <div className="sb-card">
            <div className="card-header">
              <div className="card-title"><Layers size={13} />Preset Tasks</div>
            </div>
            <div className="preset-grid">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  className={`preset-btn ${activePreset === i ? "active" : ""}`}
                  onClick={() => applyPreset(p, i)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Task Spec */}
          <div className="sb-card">
            <div className="card-header">
              <div className="card-title"><Sparkles size={13} />Task Specification</div>
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <textarea className="glow-input textarea" rows={4} value={task} onChange={e => { setTask(e.target.value); if (testMode === "auto") setTests(""); }} placeholder="Describe your function's input, logic, and output..." />
            </div>

            <div className="field-row">
              <div className="field-col">
                <label className="field-label">
                  Function
                </label>
                <input className="glow-input mono" value={fn} placeholder="e.g. is_prime" onChange={e => {
                  const cleaned = e.target.value.replace(/\s+/g, '_');
                  setFn(cleaned);
                  if (testMode === "auto") setTests("");
                }} />
              </div>
              <div className="field-col">
                <label className="field-label">Model Engine</label>
                <div className="glow-input mono" style={{ display: "flex", alignItems: "center", cursor: "default" }}>
                  GPT-OSS 120B
                </div>
              </div>
            </div>
          </div>

          {/* Test Suite */}
          <div className="sb-card">
            <div className="card-header">
              <div className="card-title"><FlaskConical size={13} />Test Suite</div>
              <div className="toggle-group">
                <button className={`toggle-pill ${testMode === "auto" ? "active" : ""}`} onClick={() => setTestMode("auto")}><Wand2 size={10} />Auto</button>
                <button className={`toggle-pill ${testMode === "manual" ? "active" : ""}`} onClick={() => setTestMode("manual")}><PenLine size={10} />Manual</button>
              </div>
            </div>

            {testMode === "auto" ? (
              <div className="auto-container">
                {tests.trim() ? <>
                  <div className="code-preview mono">{tests}</div>
                  <div className="test-toolbar">
                    <span className="test-badge-count">{testCount} test{testCount !== 1 ? "s" : ""} active</span>
                    <div className="btn-pair">
                      <button className="sub-btn" onClick={() => setTests("")}>Reset</button>
                      <button className="sub-btn highlight" onClick={autoGenerateTests} disabled={genningTests}>
                        {genningTests ? <LoaderCircle size={10} className="spin" /> : <Wand2 size={10} />}Regenerate
                      </button>
                    </div>
                  </div>
                </> : <>
                  <p className="hint-text">Tests auto-generate upon running, or pre-generate them now:</p>
                  <button className="action-btn-outline" onClick={autoGenerateTests} disabled={genningTests}>
                    {genningTests ? <><LoaderCircle size={12} className="spin" />Synthesizing Tests...</> : <><Wand2 size={12} />Generate Test Cases</>}
                  </button>
                </>}
              </div>
            ) : (
              <div className="manual-container">
                <span className="hint-text">JSON array with <code>args</code> & <code>expected</code></span>
                <textarea className="glow-input textarea mono test-box" rows={5} spellCheck="false" value={tests} onChange={e => setTests(e.target.value)} placeholder={'[\n  { "args": ["racecar"], "expected": true },\n  { "args": ["hello"], "expected": false }\n]'} />
              </div>
            )}
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* Main CTA */}
          <button className="cta-button" onClick={run} disabled={busy || genningTests}>
            {busy ? <><LoaderCircle className="spin" size={15} />Processing Pipeline…</> : <><Play size={14} fill="currentColor" />Generate & Execute Tests</>}
          </button>

          <div className="security-guarantee">
            <ShieldCheck size={12} />
            <span>Isolated Sandbox Runtime · One-Shot Repair Policy</span>
          </div>

        </div>
      </aside>

      {/* ── Right Content Area ── */}
      <main className="content">
        {/* Code Editor Frame */}
        <div className="editor-card">
          <div className="editor-tabbar">
            <div className="tab-pill active">
              <FileCode size={13} strokeWidth={2} />
              <span className="tab-name">solution.py</span>
              <span className="lang-tag">Python 3.11</span>
            </div>
            <div className="editor-ctrls">
              {busy && <span className="stream-badge"><span className="pulse-circle" />Streaming</span>}
              <button className="btn-ghost" onClick={copy} disabled={!code}>
                {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy Code</>}
              </button>
            </div>
          </div>
          <div className="editor-viewport">
            <Editor height="100%" language="python" theme="vs-dark" value={code} onChange={v => setCode(v || "")} options={{ readOnly: busy, minimap: { enabled: false }, fontSize: 13, lineHeight: 21, fontFamily: "'JetBrains Mono',monospace", padding: { top: 14, bottom: 14 }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on", renderLineHighlight: "none", overviewRulerBorder: false, hideCursorInOverviewRuler: true, scrollbar: { vertical: 'auto', horizontal: 'hidden' } }} />
          </div>
          <div className="editor-statusbar">
            <span className="status-item"><span className="dot-green" />Python 3.11</span>
            <span className="status-item">{code ? code.split("\n").length : 0} lines</span>
            <span className="status-item">UTF-8</span>
          </div>
        </div>

        {/* Execution Console & Results */}
        <div className="results-card">
          <div className="results-top">
            <div className="results-title-group">
              <Terminal size={14} strokeWidth={2} />
              <span className="results-title">Pipeline Diagnostics</span>
            </div>
            <div className={`status-pill-badge ${passed === true ? "pass" : passed === false ? "fail" : busy ? "run" : ""}`}>
              {passed === true ? <><CheckCircle2 size={11} />PASSED</> : passed === false ? <><XCircle size={11} />FAILED</> : busy ? <><LoaderCircle size={11} className="spin" />RUNNING</> : "IDLE"}
            </div>
          </div>

          {/* Step Flow Tracker */}
          <div className="step-pipeline">
            {steps.map(([key, name], i) => (
              <div className={`pipeline-step ${stage === key ? "active" : complete(i) ? "done" : ""}`} key={key}>
                <span className="step-icon">{complete(i) ? "✓" : stage === key ? <LoaderCircle size={10} className="spin" /> : i + 1}</span>
                <span className="step-label">{key === "repairing" && passed === true ? "Skipped" : name}</span>
              </div>
            ))}
          </div>

          {/* Terminal Frame with macOS dots */}
          <div className="terminal-frame">
            <div className="terminal-header">
              <div className="mac-dots">
                <span className="mac-dot red" />
                <span className="mac-dot yellow" />
                <span className="mac-dot green" />
              </div>
              <span className="terminal-label">EXECUTION LOGS</span>
              <div className="terminal-tools">
                <span className="stage-text">{label}</span>
                {output && <button className="terminal-copy-btn" onClick={() => { navigator.clipboard.writeText(output); }} title="Copy output">Copy</button>}
              </div>
            </div>
            <div className="terminal-screen">
              {output.split("\n").map((line, idx) => {
                let lineClass = "";
                if (/^(PASS|✓|All \d+)/i.test(line)) lineClass = "line-pass";
                else if (/^(Test \d+|Error|Traceback|ValueError|TypeError|Exception|TIMEOUT|Execution failed)/i.test(line) || (line.includes("expected") && line.includes("got"))) lineClass = "line-fail";
                else if (/^(Connecting|Streaming|Candidate|Generating|Executing|Re-running|Repairing)/i.test(line)) lineClass = "line-info";
                return <div key={idx} className={`term-line ${lineClass}`}>{line || "\u00A0"}</div>;
              })}
            </div>
          </div>

          {/* Audit & Compliance Cards */}
          <div className="audit-grid">
            <div className="audit-card">
              <Cpu size={13} className="audit-icon" />
              <div className="audit-content">
                <span className="audit-title">CodeBERT Semantic Ranker (U3)</span>
                <span className="audit-desc">{rankNote || "Neural cosine ranking stands ready"}</span>
              </div>
            </div>
            <div className="audit-card">
              <ShieldCheck size={13} className="audit-icon" />
              <div className="audit-content">
                <span className="audit-title">Bandit Static Security Audit (U5)</span>
                <span className="audit-desc">{bandit || "AST static analysis standing by"}</span>
              </div>
            </div>
            <div className="audit-card">
              <CheckCircle2 size={13} className="audit-icon" />
              <div className="audit-content">
                <span className="audit-title">Licence & Plagiarism Guard (U5)</span>
                <span className="audit-desc">{licenseNote || "MIT Open Source Licence · Clean-room verified"}</span>
              </div>
            </div>
          </div>

          {/* Bottom Metrics Bar */}
          <div className="metric-strip">
            <div className="metric-cell">
              <span className="metric-name">Attempts</span>
              <span className="metric-stat">{attempts || "—"}<small> / 2</small></span>
            </div>
            <div className="metric-cell">
              <span className="metric-name">Unit Tests</span>
              <span className="metric-stat">{testCount || "—"}</span>
            </div>
            <div className="metric-cell">
              <span className="metric-name">Repair Strategy</span>
              <span className="metric-stat accent">Single Retry</span>
            </div>
            <div className="metric-cell">
              <span className="metric-name">Sandbox Mode</span>
              <span className="metric-stat">Isolated Subprocess</span>
            </div>
          </div>

        </div>
      </main>
    </div>

    {/* ── Footer ── */}
    <footer className="bottombar">
      <span>Axiom · Code Generation Research Prototype</span>
    </footer>
  </div>
}
