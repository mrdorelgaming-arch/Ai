// ============================================================
//  AI-Powered Smart Study Assistant
//  Degree Project | React.js + Anthropic Claude API
//  Calls Anthropic API directly — API key entered by user
// ============================================================

import { useState, useRef, useEffect } from "react";

// ── API caller — calls Anthropic API directly ────────────────
async function callClaude(apiKey, system, userMsg, history = []) {
  const messages = [...history, { role: "user", content: userMsg }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return data.content?.[0]?.text || null;
}

function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return null; }
}

const TABS = [
  { icon: "🔬", label: "Analyze"  },
  { icon: "✏️",  label: "Quiz"    },
  { icon: "💬", label: "Chat"    },
  { icon: "📊", label: "Summary" },
];

const C = {
  bg:"#09090f", panel:"#0d0d1a", card:"#12121f",
  border:"#1e1e35", border2:"#252540",
  gold:"#e0a820", purple:"#7c52ff", blue:"#3b82f6",
  green:"#22c55e", red:"#ef4444", orange:"#f97316",
  text:"#ede8dc", dim:"#b8b0a0", muted:"#6a6880",
  white:"#ffffff",
};

export default function App() {
  const [apiKey,         setApiKey        ] = useState("");
  const [apiKeyInput,    setApiKeyInput   ] = useState("");
  const [apiKeyVisible,  setApiKeyVisible ] = useState(false);
  const [apiKeyError,    setApiKeyError   ] = useState("");
  const [tab,            setTab           ] = useState(0);
  const [content,        setContent       ] = useState("");
  const [analysis,       setAnalysis      ] = useState(null);
  const [analyzing,      setAnalyzing     ] = useState(false);
  const [quiz,           setQuiz          ] = useState([]);
  const [quizLoading,    setQuizLoading   ] = useState(false);
  const [selected,       setSelected      ] = useState({});
  const [submitted,      setSubmitted     ] = useState(false);
  const [score,          setScore         ] = useState(0);
  const [messages,       setMessages      ] = useState([]);
  const [chatInput,      setChatInput     ] = useState("");
  const [chatLoading,    setChatLoading   ] = useState(false);
  const [summary,        setSummary       ] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const chatEndRef = useRef(null);
  const hasContent = content.trim().length > 20;
  const hasKey = apiKey.trim().length > 10;

  useEffect(() => {
    const saved = sessionStorage.getItem("anthropic_api_key");
    if (saved) { setApiKey(saved); setApiKeyInput(saved); }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  function saveApiKey() {
    const k = apiKeyInput.trim();
    if (!k.startsWith("sk-ant-")) {
      setApiKeyError("Key should start with sk-ant-…");
      return;
    }
    setApiKey(k);
    sessionStorage.setItem("anthropic_api_key", k);
    setApiKeyError("");
  }

  function clearApiKey() {
    setApiKey(""); setApiKeyInput("");
    sessionStorage.removeItem("anthropic_api_key");
  }

  async function safeCall(fn) {
    try { return await fn(); }
    catch (e) {
      setApiKeyError(e.message || "API error — check your key and try again.");
      return null;
    }
  }

  async function doAnalyze() {
    if (!hasContent || !hasKey) return;
    setTab(0); setAnalyzing(true); setAnalysis(null); setApiKeyError("");
    const sys = `You are an expert academic content analyzer. Return ONLY valid JSON with no preamble:
{"title":"string","subject":"string","difficulty":"Beginner|Intermediate|Advanced","keyPoints":["string"],"concepts":[{"term":"string","definition":"string"}],"applications":["string"],"readingTime":"string"}`;
    const raw = await safeCall(() => callClaude(apiKey, sys, "Analyze this study content:\n\n" + content));
    setAnalysis(raw ? (parseJSON(raw) || { error: raw }) : null);
    setAnalyzing(false);
  }

  async function doQuiz() {
    if (!hasContent || !hasKey) return;
    setTab(1); setQuizLoading(true); setQuiz([]); setSelected({}); setSubmitted(false); setApiKeyError("");
    const sys = `You are an expert quiz generator. Return ONLY a valid JSON array of exactly 5 objects, no preamble:
[{"question":"string","options":["A) text","B) text","C) text","D) text"],"answer":"A"|"B"|"C"|"D","explanation":"string"}]`;
    const raw = await safeCall(() => callClaude(apiKey, sys, "Generate a 5-question multiple choice quiz on:\n\n" + content));
    const q = raw ? parseJSON(raw) : null;
    setQuiz(Array.isArray(q) ? q : []);
    setQuizLoading(false);
  }

  function submitQuiz() {
    let s = 0;
    quiz.forEach((q, i) => { if (selected[i] === q.answer) s++; });
    setScore(s); setSubmitted(true);
  }

  async function doChat() {
    if (!chatInput.trim() || !hasKey) return;
    const msg = chatInput.trim();
    const updated = [...messages, { role: "user", content: msg }];
    setMessages(updated); setChatInput(""); setChatLoading(true); setApiKeyError("");
    const sys = `You are a knowledgeable and encouraging AI tutor. The student is studying:\n\n${content || "(No content provided)"}\n\nGive clear, concise, helpful answers.`;
    const hist = updated.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
    const reply = await safeCall(() => callClaude(apiKey, sys, msg, hist));
    setMessages([...updated, { role: "assistant", content: reply || "Sorry, no response. Please try again." }]);
    setChatLoading(false);
  }

  async function doSummary() {
    if (!hasContent || !hasKey) return;
    setTab(3); setSummaryLoading(true); setSummary(null); setApiKeyError("");
    const sys = `You are a professional academic summarizer. Return ONLY valid JSON with no preamble:
{"oneLiner":"string","paragraph":"string","bulletPoints":["string"],"studyTips":["string"],"relatedTopics":["string"]}`;
    const raw = await safeCall(() => callClaude(apiKey, sys, "Create a comprehensive study summary of:\n\n" + content));
    setSummary(raw ? (parseJSON(raw) || { error: raw }) : null);
    setSummaryLoading(false);
  }

  const btnBase = {
    width:"100%", padding:"11px 8px", borderRadius:9,
    fontSize:12.5, fontFamily:"Georgia,serif", cursor:"not-allowed",
    transition:"all .2s", border:`1px solid ${C.border2}`,
    background:C.card, color:C.muted, marginBottom:8,
  };
  const btnOn = {
    ...btnBase, cursor:"pointer",
    background:"linear-gradient(135deg,#1e1400,#180e2e)",
    border:`1px solid ${C.gold}`, color:C.gold,
  };
  const btnChat = {
    ...btnBase, cursor:"pointer",
    background:"linear-gradient(135deg,#100e28,#0e0828)",
    border:`1px solid ${C.purple}`, color:C.purple,
  };
  const canAct = hasContent && hasKey;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Georgia,serif", display:"flex", flexDirection:"column" }}>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#140e04,#0c0820,#061408)", borderBottom:"1px solid #2a2210", padding:"15px 24px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
        <div style={{ width:46, height:46, borderRadius:13, background:`linear-gradient(135deg,${C.gold},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, boxShadow:"0 4px 15px rgba(224,168,32,.3)" }}>🧠</div>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:"#f5e8c0", letterSpacing:-.4 }}>AI Study Assistant</div>
          <div style={{ fontSize:11, color:"#7a6a40", fontFamily:"monospace", marginTop:2 }}>Powered by Claude AI · Degree Project · 2024-2025</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ padding:"3px 10px", borderRadius:20, background:hasKey?"#062006":"#1a0808", border:`1px solid ${hasKey?C.green:C.red}`, fontSize:10, color:hasKey?C.green:C.red, fontFamily:"monospace" }}>
            {hasKey ? "✓ API Key Set" : "⚠ No API Key"}
          </span>
          {["Analyze","Quiz","Chat","Summarize"].map((f,i) => (
            <span key={i} style={{ padding:"3px 10px", borderRadius:20, background:"#181408", border:"1px solid #2e2810", fontSize:10, color:"#907830", fontFamily:"monospace" }}>{f}</span>
          ))}
        </div>
      </div>

      {/* API KEY BANNER */}
      {!hasKey && (
        <div style={{ background:"#0f0808", borderBottom:`1px solid ${C.red}40`, padding:"14px 24px", display:"flex", alignItems:"center", gap:12, flexShrink:0, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, color:"#f87171", flexShrink:0 }}>🔑 Enter your Anthropic API key to get started:</span>
          <div style={{ position:"relative", flex:1, minWidth:260, maxWidth:420 }}>
            <input
              type={apiKeyVisible ? "text" : "password"}
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveApiKey()}
              placeholder="sk-ant-api03-..."
              style={{ width:"100%", padding:"9px 40px 9px 12px", background:"#1a0a0a", border:`1px solid ${apiKeyError?C.red:"#3a1a1a"}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:"monospace", outline:"none", boxSizing:"border-box" }}
            />
            <button onClick={() => setApiKeyVisible(v => !v)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:14, color:C.muted }}>
              {apiKeyVisible ? "🙈" : "👁"}
            </button>
          </div>
          <button onClick={saveApiKey} style={{ padding:"9px 18px", borderRadius:8, background:`linear-gradient(135deg,${C.gold},${C.purple})`, border:"none", color:C.white, fontSize:13, fontFamily:"Georgia,serif", cursor:"pointer", fontWeight:600, flexShrink:0 }}>
            Save Key
          </button>
          {apiKeyError && <span style={{ fontSize:12, color:C.red }}>{apiKeyError}</span>}
          <span style={{ fontSize:11, color:C.muted, width:"100%", marginTop:2 }}>
            💡 Get your key at <strong style={{color:"#b08040"}}>console.anthropic.com</strong> · Key is stored in sessionStorage only (never sent anywhere else)
          </span>
        </div>
      )}

      {/* API KEY MANAGEMENT BAR */}
      {hasKey && (
        <div style={{ background:"#060e06", borderBottom:`1px solid ${C.green}30`, padding:"8px 24px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <span style={{ fontSize:11, color:C.green, fontFamily:"monospace" }}>
            🔑 API Key: {apiKey.slice(0,14)}…{apiKey.slice(-4)}
          </span>
          <button onClick={clearApiKey} style={{ padding:"4px 12px", borderRadius:6, background:"#1a0808", border:`1px solid ${C.red}50`, color:"#f87171", fontSize:11, fontFamily:"monospace", cursor:"pointer" }}>
            ✕ Remove
          </button>
          {apiKeyError && <span style={{ fontSize:12, color:C.red, marginLeft:8 }}>⚠ {apiKeyError}</span>}
        </div>
      )}

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* LEFT PANEL */}
        <div style={{ width:315, flexShrink:0, background:C.panel, borderRight:`1px solid ${C.border}`, padding:18, display:"flex", flexDirection:"column", gap:13, overflowY:"auto" }}>
          <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:10, color:C.muted, fontFamily:"monospace", letterSpacing:1.5, textTransform:"uppercase", marginBottom:7 }}>Study Content</div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={"Paste your study material here...\n\n• Textbook chapters\n• Lecture notes\n• Research papers\n• Any topic you're studying"}
              style={{ flex:1, minHeight:280, padding:"12px 14px", background:C.card, border:`1px solid ${C.border2}`, borderRadius:10, color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", resize:"none", lineHeight:1.75, boxSizing:"border-box" }}
            />
          </div>
          <div style={{ padding:"12px 14px", borderRadius:9, background:C.card, border:`1px solid ${C.border2}`, fontSize:12, color:C.muted, lineHeight:1.75 }}>
            <span style={{ color:"#a08840", fontWeight:600 }}>💡 How to use:</span><br/>
            1. Enter your Anthropic API key above<br/>
            2. Paste your notes or textbook<br/>
            3. Click any feature button below!
          </div>
          <div>
            {[
              { label:"📄  Analyze Content", fn: doAnalyze },
              { label:"✏️  Generate Quiz",    fn: doQuiz    },
              { label:"📊  Smart Summary",   fn: doSummary },
            ].map((b,i) => (
              <button key={i} onClick={b.fn} disabled={!canAct} style={canAct ? btnOn : btnBase}>{b.label}</button>
            ))}
            <button onClick={() => setTab(2)} style={hasKey ? btnChat : btnBase} disabled={!hasKey}>💬  AI Tutor Chat</button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:"#0b0b16", flexShrink:0 }}>
            {TABS.map((t,i) => (
              <button key={i} onClick={() => setTab(i)} style={{
                padding:"13px 22px", background:"none", border:"none",
                borderBottom:`2.5px solid ${tab===i?C.gold:"transparent"}`,
                color:tab===i?C.gold:C.muted,
                fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif",
                transition:"all .2s", fontWeight:tab===i?600:400,
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"26px 30px", display:"flex", flexDirection:"column" }}>

            {tab === 0 && (
              <div>
                <STitle>Content Analysis</STitle>
                {!analyzing && !analysis && <Empty icon="🔬" text={hasKey ? "Paste your study material and click 📄 Analyze Content to get a detailed AI-powered breakdown." : "Set your Anthropic API key in the banner above to get started."} />}
                {analyzing && <Spin text="Analyzing with Claude AI..." />}
                {analysis && !analysis.error && (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <IBadge label="Subject"    value={analysis.subject}     color={C.purple} />
                      <IBadge label="Difficulty" value={analysis.difficulty}  color={analysis.difficulty==="Beginner"?C.green:analysis.difficulty==="Intermediate"?C.orange:C.red} />
                      <IBadge label="Read Time"  value={analysis.readingTime} color={C.blue} />
                    </div>
                    {analysis.title && (
                      <div style={{ padding:"14px 18px", borderRadius:10, background:"linear-gradient(135deg,#1a1208,#0e0a1e)", border:`1px solid ${C.gold}40` }}>
                        <div style={{ fontSize:10, fontFamily:"monospace", color:C.gold, letterSpacing:2, marginBottom:6 }}>TITLE</div>
                        <div style={{ fontSize:16, color:"#f0e6c8", fontStyle:"italic" }}>{analysis.title}</div>
                      </div>
                    )}
                    <SCard title="📌 Key Points">
                      {analysis.keyPoints?.map((p,i) => <BRow key={i} icon="▸" color={C.gold} text={p} />)}
                    </SCard>
                    <SCard title="🔑 Key Concepts">
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        {analysis.concepts?.map((c,i) => (
                          <div key={i} style={{ padding:"11px 13px", borderRadius:8, background:C.bg, border:`1px solid ${C.border2}` }}>
                            <div style={{ fontSize:12.5, fontWeight:700, color:C.gold, marginBottom:5 }}>{c.term}</div>
                            <div style={{ fontSize:11.5, color:"#8a8070", lineHeight:1.55 }}>{c.definition}</div>
                          </div>
                        ))}
                      </div>
                    </SCard>
                    <SCard title="⚡ Real-World Applications">
                      {analysis.applications?.map((a,i) => <BRow key={i} icon="◆" color={C.purple} text={a} />)}
                    </SCard>
                  </div>
                )}
                {analysis?.error && <EBox text={analysis.error} />}
              </div>
            )}

            {tab === 1 && (
              <div>
                <STitle>Quiz Generator</STitle>
                {!quizLoading && quiz.length===0 && <Empty icon="✏️" text={hasKey ? "Paste your study material and click ✏️ Generate Quiz to create 5 multiple-choice questions with scoring." : "Set your Anthropic API key in the banner above to get started."} />}
                {quizLoading && <Spin text="Generating quiz with Claude AI..." />}
                {quiz.length > 0 && (
                  <div>
                    {submitted && (
                      <div style={{ padding:22, borderRadius:14, textAlign:"center", marginBottom:22, background:score>=4?"#062006":score>=3?"#1a1200":"#1a0606", border:`1px solid ${score>=4?C.green:score>=3?C.orange:C.red}` }}>
                        <div style={{ fontSize:38, marginBottom:10 }}>{score===5?"🏆":score>=4?"🥇":score>=3?"🌟":"📚"}</div>
                        <div style={{ fontSize:26, fontWeight:700, color:score>=4?C.green:score>=3?C.orange:C.red }}>{score} / 5</div>
                        <div style={{ fontSize:13, color:C.muted, marginTop:5 }}>{score===5?"Perfect! Outstanding mastery!":score>=3?"Good job! Review the missed ones.":"Keep studying — check the explanations below!"}</div>
                        <button onClick={()=>{setSelected({});setSubmitted(false);doQuiz();}} style={{ marginTop:14, padding:"9px 22px", borderRadius:8, background:"#181408", border:`1px solid ${C.gold}`, color:C.gold, cursor:"pointer", fontFamily:"Georgia,serif", fontSize:13 }}>🔄 New Quiz</button>
                      </div>
                    )}
                    {quiz.map((q,qi) => {
                      const ok  = submitted && selected[qi]===q.answer;
                      const bad = submitted && selected[qi] && selected[qi]!==q.answer;
                      return (
                        <div key={qi} style={{ marginBottom:20, padding:18, borderRadius:13, background:C.panel, border:`1px solid ${submitted?(ok?C.green:bad?C.red:C.border2):C.border2}` }}>
                          <div style={{ fontSize:13.5, fontWeight:600, color:C.text, lineHeight:1.55, marginBottom:13 }}>
                            <span style={{ color:C.gold, marginRight:6 }}>Q{qi+1}.</span>{q.question}
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {q.options.map((opt,oi) => {
                              const l=["A","B","C","D"][oi];
                              const isSel=selected[qi]===l;
                              const showOk=submitted&&l===q.answer;
                              const showBad=submitted&&isSel&&l!==q.answer;
                              return (
                                <div key={oi} onClick={()=>!submitted&&setSelected(s=>({...s,[qi]:l}))}
                                  style={{ padding:"10px 15px", borderRadius:9, fontSize:13, cursor:submitted?"default":"pointer", userSelect:"none", transition:"all .15s",
                                    background:showOk?"#062006":showBad?"#200606":isSel?"#141030":C.card,
                                    border:`1px solid ${showOk?C.green:showBad?C.red:isSel?C.purple:C.border2}`, color:C.dim }}>
                                  <span style={{ fontWeight:700, marginRight:8, color:showOk?C.green:showBad?C.red:isSel?C.purple:C.muted }}>{l}</span>
                                  {opt.replace(/^[A-D]\)\s*/,"")}
                                  {showOk && <span style={{ marginLeft:8, color:C.green }}>✓ Correct</span>}
                                  {showBad && <span style={{ marginLeft:8, color:C.red }}>✗ Wrong</span>}
                                </div>
                              );
                            })}
                          </div>
                          {submitted && (
                            <div style={{ marginTop:13, padding:"11px 14px", borderRadius:9, background:C.bg, border:`1px solid ${C.border2}`, fontSize:12, color:"#8a8070", lineHeight:1.6 }}>
                              <strong style={{ color:C.gold }}>💡 Explanation: </strong>{q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!submitted && (
                      <button onClick={submitQuiz} disabled={Object.keys(selected).length<5}
                        style={{ width:"100%", padding:15, borderRadius:11, border:"none", fontFamily:"Georgia,serif", fontWeight:600, fontSize:15, transition:"all .2s",
                          background:Object.keys(selected).length===5?`linear-gradient(135deg,${C.gold},${C.purple})`:C.card,
                          color:Object.keys(selected).length===5?C.white:C.muted,
                          cursor:Object.keys(selected).length===5?"pointer":"not-allowed" }}>
                        Submit Quiz ({Object.keys(selected).length} / 5 answered)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 2 && (
              <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:0 }}>
                <STitle>AI Tutor Chat</STitle>
                <div style={{ fontSize:12.5, color:C.muted, marginBottom:16 }}>Ask Claude anything about your study material. Multi-turn context is supported.</div>
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, minHeight:0, paddingBottom:8 }}>
                  {messages.length===0 && (
                    <div style={{ textAlign:"center", padding:"50px 20px", color:"#3a3850" }}>
                      <div style={{ fontSize:44, marginBottom:14 }}>💬</div>
                      <div style={{ fontSize:15, color:"#5a5870" }}>{hasKey ? "Start a conversation with your AI tutor" : "Set your API key above to start chatting"}</div>
                      <div style={{ fontSize:12, marginTop:10, color:"#3a3850" }}>Try: "Explain the key concepts" · "What's likely on the exam?" · "Give me a quick summary"</div>
                    </div>
                  )}
                  {messages.map((m,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                      <div style={{ maxWidth:"78%", padding:"12px 16px",
                        borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                        background:m.role==="user"?"linear-gradient(135deg,#201600,#140c26)":C.card,
                        border:`1px solid ${m.role==="user"?C.gold+"60":C.border2}`,
                        fontSize:13, lineHeight:1.75, color:C.dim }}>
                        {m.role==="assistant" && <div style={{ fontSize:10, color:C.gold, fontFamily:"monospace", marginBottom:7, letterSpacing:1.5 }}>🧠 AI TUTOR</div>}
                        {m.content.split('\n').map((ln,li) => <span key={li}>{ln}{li<m.content.split('\n').length-1&&<br/>}</span>)}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display:"flex", gap:7, padding:"12px 16px", alignItems:"center" }}>
                      <div style={{ fontSize:10, color:C.muted, fontFamily:"monospace", marginRight:4 }}>AI is thinking</div>
                      {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:"50%", background:C.gold, animation:"bounce 1.2s infinite", animationDelay:`${i*.2}s` }}/>)}
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{ display:"flex", gap:10, paddingTop:14, borderTop:`1px solid ${C.border}`, marginTop:"auto" }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&doChat()}
                    placeholder={hasKey ? "Ask your AI tutor anything... (Enter to send)" : "Set your API key to start chatting..."}
                    disabled={!hasKey}
                    style={{ flex:1, padding:"13px 15px", background:C.card, border:`1px solid ${C.border2}`, borderRadius:11, color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", opacity:hasKey?1:0.5 }}/>
                  <button onClick={doChat} disabled={!chatInput.trim()||chatLoading||!hasKey}
                    style={{ padding:"13px 20px", borderRadius:11, border:"none", fontSize:17,
                      background:chatInput.trim()&&hasKey?`linear-gradient(135deg,${C.gold},${C.purple})`:C.card,
                      color:chatInput.trim()&&hasKey?C.white:C.muted,
                      cursor:chatInput.trim()&&hasKey?"pointer":"not-allowed" }}>➤</button>
                </div>
                <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}`}</style>
              </div>
            )}

            {tab === 3 && (
              <div>
                <STitle>Smart Summary</STitle>
                {!summaryLoading && !summary && <Empty icon="📊" text={hasKey ? "Paste your study material and click 📊 Smart Summary for structured notes with study tips and related topics." : "Set your Anthropic API key in the banner above to get started."} />}
                {summaryLoading && <Spin text="Generating smart summary with Claude AI..." />}
                {summary && !summary.error && (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div style={{ padding:"20px 22px", borderRadius:13, background:"linear-gradient(135deg,#1a1208,#0e0a1e)", border:`1px solid ${C.gold}` }}>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:C.gold, letterSpacing:2.5, marginBottom:10 }}>✨ ONE-LINER</div>
                      <div style={{ fontSize:16, fontStyle:"italic", color:"#f0e6c8", lineHeight:1.7 }}>"{summary.oneLiner}"</div>
                    </div>
                    <SCard title="📝 Summary">
                      <p style={{ fontSize:13.5, lineHeight:1.85, color:C.dim, margin:0 }}>{summary.paragraph}</p>
                    </SCard>
                    <SCard title="📌 Key Points">
                      {summary.bulletPoints?.map((p,i) => <BRow key={i} icon="•" color={C.gold} text={p} />)}
                    </SCard>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                      <SCard title="💡 Study Tips">
                        {summary.studyTips?.map((t,i) => <BRow key={i} icon="→" color={C.purple} text={t} />)}
                      </SCard>
                      <SCard title="🔗 Related Topics">
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                          {summary.relatedTopics?.map((t,i) => (
                            <span key={i} style={{ padding:"6px 13px", borderRadius:20, background:"#14102a", border:"1px solid #3a2a5a", fontSize:12, color:"#b090e0" }}>{t}</span>
                          ))}
                        </div>
                      </SCard>
                    </div>
                  </div>
                )}
                {summary?.error && <EBox text={summary.error} />}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function STitle({ children }) {
  return <div style={{ fontSize:20, color:"#e0a820", marginBottom:20, fontWeight:700 }}>{children}</div>;
}
function Empty({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"70px 20px" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>{icon}</div>
      <div style={{ fontSize:14, maxWidth:340, margin:"0 auto", lineHeight:1.8, color:"#4a4868" }}>{text}</div>
    </div>
  );
}
function Spin({ text }) {
  return (
    <div style={{ textAlign:"center", padding:"70px 20px" }}>
      <div style={{ fontSize:38, marginBottom:14, display:"inline-block", animation:"spin 2s linear infinite" }}>⚙️</div>
      <div style={{ fontSize:14, color:"#7a6a40" }}>{text}</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function IBadge({ label, value, color }) {
  return (
    <div style={{ padding:"9px 15px", borderRadius:9, background:"#12121f", border:`1px solid ${color}35` }}>
      <div style={{ fontSize:9.5, fontFamily:"monospace", color:"#6a6880", letterSpacing:1.5, marginBottom:3 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize:14, fontWeight:700, color }}>{value}</div>
    </div>
  );
}
function SCard({ title, children }) {
  return (
    <div style={{ padding:"16px 18px", borderRadius:11, background:"#0d0d1a", border:"1px solid #1e1e35" }}>
      <div style={{ fontSize:12.5, fontWeight:700, color:"#907840", marginBottom:12 }}>{title}</div>
      {children}
    </div>
  );
}
function BRow({ icon, color, text }) {
  return (
    <div style={{ display:"flex", gap:10, marginBottom:9, alignItems:"flex-start" }}>
      <span style={{ color, flexShrink:0, marginTop:3, fontSize:13 }}>{icon}</span>
      <span style={{ fontSize:13, color:"#b8b0a0", lineHeight:1.65 }}>{text}</span>
    </div>
  );
}
function EBox({ text }) {
  return (
    <div style={{ padding:"16px 18px", borderRadius:10, background:"#1a0808", border:"1px solid #ef4444", fontSize:13, color:"#f87171", lineHeight:1.6 }}>
      <strong>⚠️ Error:</strong> {text}
    </div>
  );
}
