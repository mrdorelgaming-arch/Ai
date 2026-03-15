// ============================================================
//  AI-Powered Smart Study Assistant
//  Degree Project | React.js + Google Gemini API
//  Calls /api/gemini → netlify/functions/gemini.js (secure)
// ============================================================

import { useState, useRef, useEffect } from "react";

// ── API caller — posts to Gemini backend ─────────────────────
async function callGemini(system, userMsg, history = []) {
  const messages = [
    ...history,
    { role: "user", content: userMsg },
  ];
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ── JSON parser — strips markdown fences if present ─────────
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

// ── Color palette ────────────────────────────────────────────
const C = {
  bg:      "#09090f", panel:  "#0d0d1a", card:   "#12121f",
  border:  "#1e1e35", border2:"#252540",
  blue:    "#4285F4", green:  "#34A853", yellow: "#FBBC05", red:    "#EA4335",
  purple:  "#7c52ff", orange: "#f97316",
  text:    "#ede8dc", dim:    "#b8b0a0", muted:  "#6a6880",
  white:   "#ffffff",
};

export default function App() {
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
  const [error,          setError         ] = useState("");
  const chatEndRef = useRef(null);
  const hasContent = content.trim().length > 20;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function safeCall(fn) {
    try { setError(""); return await fn(); }
    catch (e) { setError(e.message || "Something went wrong. Please try again."); return null; }
  }

  // ── ANALYZE ───────────────────────────────────────────────
  async function doAnalyze() {
    if (!hasContent) return;
    setTab(0); setAnalyzing(true); setAnalysis(null);
    const sys = `You are an expert academic content analyzer. Return ONLY valid JSON with no preamble or markdown fences:
{"title":"string","subject":"string","difficulty":"Beginner|Intermediate|Advanced","keyPoints":["string"],"concepts":[{"term":"string","definition":"string"}],"applications":["string"],"readingTime":"string"}`;
    const raw = await safeCall(() => callGemini(sys, "Analyze this study content:\n\n" + content));
    setAnalysis(raw ? (parseJSON(raw) || { error: raw }) : null);
    setAnalyzing(false);
  }

  // ── QUIZ ─────────────────────────────────────────────────
  async function doQuiz() {
    if (!hasContent) return;
    setTab(1); setQuizLoading(true); setQuiz([]); setSelected({}); setSubmitted(false);
    const sys = `You are an expert quiz generator. Return ONLY a valid JSON array of exactly 5 objects, no preamble or markdown fences:
[{"question":"string","options":["A) text","B) text","C) text","D) text"],"answer":"A"|"B"|"C"|"D","explanation":"string"}]`;
    const raw = await safeCall(() => callGemini(sys, "Generate a 5-question multiple choice quiz on:\n\n" + content));
    const q = raw ? parseJSON(raw) : null;
    setQuiz(Array.isArray(q) ? q : []);
    setQuizLoading(false);
  }

  function submitQuiz() {
    let s = 0;
    quiz.forEach((q, i) => { if (selected[i] === q.answer) s++; });
    setScore(s); setSubmitted(true);
  }

  // ── CHAT ─────────────────────────────────────────────────
  async function doChat() {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    const updated = [...messages, { role: "user", content: msg }];
    setMessages(updated); setChatInput(""); setChatLoading(true);
    const sys = `You are a knowledgeable and encouraging AI tutor powered by Google Gemini. The student is studying:\n\n${content || "(No content provided)"}\n\nGive clear, concise, helpful answers.`;
    const hist = updated.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
    const reply = await safeCall(() => callGemini(sys, msg, hist));
    setMessages([...updated, { role: "assistant", content: reply || "Sorry, no response. Please try again." }]);
    setChatLoading(false);
  }

  // ── SUMMARY ──────────────────────────────────────────────
  async function doSummary() {
    if (!hasContent) return;
    setTab(3); setSummaryLoading(true); setSummary(null);
    const sys = `You are a professional academic summarizer. Return ONLY valid JSON with no preamble or markdown fences:
{"oneLiner":"string","paragraph":"string","bulletPoints":["string"],"studyTips":["string"],"relatedTopics":["string"]}`;
    const raw = await safeCall(() => callGemini(sys, "Create a comprehensive study summary of:\n\n" + content));
    setSummary(raw ? (parseJSON(raw) || { error: raw }) : null);
    setSummaryLoading(false);
  }

  // ── STYLES ────────────────────────────────────────────────
  const btnBase = {
    width: "100%", padding: "11px 8px", borderRadius: 9,
    fontSize: 12.5, fontFamily: "Georgia,serif", cursor: "not-allowed",
    transition: "all .2s", border: `1px solid ${C.border2}`,
    background: C.card, color: C.muted, marginBottom: 8,
  };
  const btnOn = {
    ...btnBase, cursor: "pointer",
    background: "linear-gradient(135deg,#081a10,#08102a)",
    border: `1px solid ${C.blue}`, color: C.blue,
  };
  const btnChat = {
    ...btnBase, cursor: "pointer",
    background: "linear-gradient(135deg,#0a1a08,#08120a)",
    border: `1px solid ${C.green}`, color: C.green,
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Georgia,serif", display:"flex", flexDirection:"column" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(135deg,#060e14,#08100c,#06080e)", borderBottom:"1px solid #102018", padding:"15px 24px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
        {/* Google-coloured logo */}
        <div style={{ width:46, height:46, borderRadius:13, background:"linear-gradient(135deg,#4285F4,#34A853,#FBBC05,#EA4335)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, boxShadow:"0 4px 15px rgba(66,133,244,.35)" }}>🧠</div>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:"#c8e8d8", letterSpacing:-.4 }}>AI Study Assistant</div>
          <div style={{ fontSize:11, color:"#3a6a4a", fontFamily:"monospace", marginTop:2 }}>Powered by Google Gemini · Degree Project · 2024-2025</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {["Analyze","Quiz","Chat","Summarize"].map((f,i) => (
            <span key={i} style={{ padding:"3px 10px", borderRadius:20, background:"#081408", border:"1px solid #102810", fontSize:10, color:"#3a7a4a", fontFamily:"monospace" }}>{f}</span>
          ))}
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div style={{ background:"#1a0808", borderBottom:`1px solid ${C.red}50`, padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontSize:13, color:"#f87171" }}>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
      )}

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── LEFT PANEL ── */}
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

          {/* Info box */}
          <div style={{ padding:"12px 14px", borderRadius:9, background:C.card, border:`1px solid ${C.border2}`, fontSize:12, color:C.muted, lineHeight:1.75 }}>
            <span style={{ color:C.green, fontWeight:600 }}>💡 How to use:</span><br/>
            1. Paste your notes or textbook above<br/>
            2. Click any feature button below<br/>
            3. Get instant Gemini-powered results!
          </div>

          {/* Action buttons */}
          <div>
            {[
              { label:"📄  Analyze Content", fn: doAnalyze },
              { label:"✏️  Generate Quiz",    fn: doQuiz    },
              { label:"📊  Smart Summary",   fn: doSummary },
            ].map((b,i) => (
              <button key={i} onClick={b.fn} disabled={!hasContent}
                style={hasContent ? btnOn : btnBase}>{b.label}</button>
            ))}
            <button onClick={() => setTab(2)} style={btnChat}>💬  AI Tutor Chat</button>
          </div>

          {/* Gemini branding badge */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"8px 0", borderTop:`1px solid ${C.border}` }}>
            <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>Powered by</span>
            <span style={{ fontSize:12, fontWeight:700, background:"linear-gradient(90deg,#4285F4,#34A853,#FBBC05,#EA4335)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Google Gemini</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:"#0b0b16", flexShrink:0 }}>
            {TABS.map((t,i) => (
              <button key={i} onClick={() => setTab(i)} style={{
                padding:"13px 22px", background:"none", border:"none",
                borderBottom:`2.5px solid ${tab===i ? C.blue : "transparent"}`,
                color: tab===i ? C.blue : C.muted,
                fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif",
                transition:"all .2s", fontWeight: tab===i ? 600 : 400,
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"26px 30px", display:"flex", flexDirection:"column" }}>

            {/* ── ANALYZE TAB ── */}
            {tab === 0 && (
              <div>
                <STitle color={C.blue}>Content Analysis</STitle>
                {!analyzing && !analysis && <Empty icon="🔬" text="Paste your study material and click 📄 Analyze Content to get a detailed Gemini-powered breakdown." />}
                {analyzing && <Spin text="Analyzing with Google Gemini..." color={C.blue} />}
                {analysis && !analysis.error && (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <IBadge label="Subject"    value={analysis.subject}    color={C.blue} />
                      <IBadge label="Difficulty" value={analysis.difficulty} color={analysis.difficulty==="Beginner"?C.green:analysis.difficulty==="Intermediate"?C.yellow:C.red} />
                      <IBadge label="Read Time"  value={analysis.readingTime} color={C.purple} />
                    </div>
                    {analysis.title && (
                      <div style={{ padding:"14px 18px", borderRadius:10, background:"linear-gradient(135deg,#08141e,#08100e)", border:`1px solid ${C.blue}40` }}>
                        <div style={{ fontSize:10, fontFamily:"monospace", color:C.blue, letterSpacing:2, marginBottom:6 }}>TITLE</div>
                        <div style={{ fontSize:16, color:"#c8e8d8", fontStyle:"italic" }}>{analysis.title}</div>
                      </div>
                    )}
                    <SCard title="📌 Key Points">
                      {analysis.keyPoints?.map((p,i) => <BRow key={i} icon="▸" color={C.blue} text={p} />)}
                    </SCard>
                    <SCard title="🔑 Key Concepts">
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        {analysis.concepts?.map((c,i) => (
                          <div key={i} style={{ padding:"11px 13px", borderRadius:8, background:C.bg, border:`1px solid ${C.border2}` }}>
                            <div style={{ fontSize:12.5, fontWeight:700, color:C.blue, marginBottom:5 }}>{c.term}</div>
                            <div style={{ fontSize:11.5, color:"#8a8070", lineHeight:1.55 }}>{c.definition}</div>
                          </div>
                        ))}
                      </div>
                    </SCard>
                    <SCard title="⚡ Real-World Applications">
                      {analysis.applications?.map((a,i) => <BRow key={i} icon="◆" color={C.green} text={a} />)}
                    </SCard>
                  </div>
                )}
                {analysis?.error && <EBox text={analysis.error} />}
              </div>
            )}

            {/* ── QUIZ TAB ── */}
            {tab === 1 && (
              <div>
                <STitle color={C.blue}>Quiz Generator</STitle>
                {!quizLoading && quiz.length===0 && <Empty icon="✏️" text="Paste your study material and click ✏️ Generate Quiz to create 5 multiple-choice questions with scoring." />}
                {quizLoading && <Spin text="Generating quiz with Google Gemini..." color={C.blue} />}
                {quiz.length > 0 && (
                  <div>
                    {submitted && (
                      <div style={{ padding:22, borderRadius:14, textAlign:"center", marginBottom:22, background:score>=4?"#062006":score>=3?"#1a1200":"#1a0606", border:`1px solid ${score>=4?C.green:score>=3?C.yellow:C.red}` }}>
                        <div style={{ fontSize:38, marginBottom:10 }}>{score===5?"🏆":score>=4?"🥇":score>=3?"🌟":"📚"}</div>
                        <div style={{ fontSize:26, fontWeight:700, color:score>=4?C.green:score>=3?C.yellow:C.red }}>{score} / 5</div>
                        <div style={{ fontSize:13, color:C.muted, marginTop:5 }}>
                          {score===5?"Perfect! Outstanding mastery!":score>=3?"Good job! Review the missed ones.":"Keep studying — check the explanations below!"}
                        </div>
                        <button onClick={()=>{setSelected({});setSubmitted(false);doQuiz();}}
                          style={{ marginTop:14, padding:"9px 22px", borderRadius:8, background:"#081408", border:`1px solid ${C.green}`, color:C.green, cursor:"pointer", fontFamily:"Georgia,serif", fontSize:13 }}>
                          🔄 New Quiz
                        </button>
                      </div>
                    )}
                    {quiz.map((q,qi) => {
                      const ok  = submitted && selected[qi]===q.answer;
                      const bad = submitted && selected[qi] && selected[qi]!==q.answer;
                      return (
                        <div key={qi} style={{ marginBottom:20, padding:18, borderRadius:13, background:C.panel, border:`1px solid ${submitted?(ok?C.green:bad?C.red:C.border2):C.border2}` }}>
                          <div style={{ fontSize:13.5, fontWeight:600, color:C.text, lineHeight:1.55, marginBottom:13 }}>
                            <span style={{ color:C.blue, marginRight:6 }}>Q{qi+1}.</span>{q.question}
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
                                    background:showOk?"#062006":showBad?"#200606":isSel?"#0a1020":C.card,
                                    border:`1px solid ${showOk?C.green:showBad?C.red:isSel?C.blue:C.border2}`,
                                    color:C.dim }}>
                                  <span style={{ fontWeight:700, marginRight:8, color:showOk?C.green:showBad?C.red:isSel?C.blue:C.muted }}>{l}</span>
                                  {opt.replace(/^[A-D]\)\s*/,"")}
                                  {showOk && <span style={{ marginLeft:8, color:C.green }}>✓ Correct</span>}
                                  {showBad && <span style={{ marginLeft:8, color:C.red }}>✗ Wrong</span>}
                                </div>
                              );
                            })}
                          </div>
                          {submitted && (
                            <div style={{ marginTop:13, padding:"11px 14px", borderRadius:9, background:C.bg, border:`1px solid ${C.border2}`, fontSize:12, color:"#8a8070", lineHeight:1.6 }}>
                              <strong style={{ color:C.green }}>💡 Explanation: </strong>{q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!submitted && (
                      <button onClick={submitQuiz} disabled={Object.keys(selected).length<5}
                        style={{ width:"100%", padding:15, borderRadius:11, border:"none", fontFamily:"Georgia,serif", fontWeight:600, fontSize:15, transition:"all .2s",
                          background:Object.keys(selected).length===5?"linear-gradient(135deg,#4285F4,#34A853)":C.card,
                          color:Object.keys(selected).length===5?C.white:C.muted,
                          cursor:Object.keys(selected).length===5?"pointer":"not-allowed" }}>
                        Submit Quiz ({Object.keys(selected).length} / 5 answered)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {tab === 2 && (
              <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:0 }}>
                <STitle color={C.blue}>AI Tutor Chat</STitle>
                <div style={{ fontSize:12.5, color:C.muted, marginBottom:16 }}>Ask Gemini anything about your study material. Multi-turn context is supported.</div>
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, minHeight:0, paddingBottom:8 }}>
                  {messages.length===0 && (
                    <div style={{ textAlign:"center", padding:"50px 20px", color:"#3a3850" }}>
                      <div style={{ fontSize:44, marginBottom:14 }}>💬</div>
                      <div style={{ fontSize:15, color:"#5a5870" }}>Start a conversation with your Gemini AI tutor</div>
                      <div style={{ fontSize:12, marginTop:10, color:"#3a3850" }}>Try: "Explain the key concepts" · "What's likely on the exam?" · "Give me a quick summary"</div>
                    </div>
                  )}
                  {messages.map((m,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                      <div style={{ maxWidth:"78%", padding:"12px 16px",
                        borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                        background:m.role==="user"?"linear-gradient(135deg,#001020,#081820)":C.card,
                        border:`1px solid ${m.role==="user"?C.blue+"50":C.border2}`,
                        fontSize:13, lineHeight:1.75, color:C.dim }}>
                        {m.role==="assistant" && (
                          <div style={{ fontSize:10, fontFamily:"monospace", marginBottom:7, letterSpacing:1.5, background:"linear-gradient(90deg,#4285F4,#34A853)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                            🤖 GEMINI TUTOR
                          </div>
                        )}
                        {m.content.split('\n').map((ln,li) => <span key={li}>{ln}{li<m.content.split('\n').length-1&&<br/>}</span>)}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display:"flex", gap:7, padding:"12px 16px", alignItems:"center" }}>
                      <div style={{ fontSize:10, color:C.muted, fontFamily:"monospace", marginRight:4 }}>Gemini is thinking</div>
                      {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:"50%", background:C.blue, animation:"bounce 1.2s infinite", animationDelay:`${i*.2}s` }}/>)}
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{ display:"flex", gap:10, paddingTop:14, borderTop:`1px solid ${C.border}`, marginTop:"auto" }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&doChat()}
                    placeholder="Ask your Gemini tutor anything... (Enter to send)"
                    style={{ flex:1, padding:"13px 15px", background:C.card, border:`1px solid ${C.border2}`, borderRadius:11, color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none" }}/>
                  <button onClick={doChat} disabled={!chatInput.trim()||chatLoading}
                    style={{ padding:"13px 20px", borderRadius:11, border:"none", fontSize:17,
                      background:chatInput.trim()?"linear-gradient(135deg,#4285F4,#34A853)":C.card,
                      color:chatInput.trim()?C.white:C.muted,
                      cursor:chatInput.trim()?"pointer":"not-allowed" }}>➤</button>
                </div>
                <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}`}</style>
              </div>
            )}

            {/* ── SUMMARY TAB ── */}
            {tab === 3 && (
              <div>
                <STitle color={C.blue}>Smart Summary</STitle>
                {!summaryLoading && !summary && <Empty icon="📊" text="Paste your study material and click 📊 Smart Summary for structured notes with study tips and related topics." />}
                {summaryLoading && <Spin text="Generating smart summary with Google Gemini..." color={C.blue} />}
                {summary && !summary.error && (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div style={{ padding:"20px 22px", borderRadius:13, background:"linear-gradient(135deg,#08141e,#08100e)", border:`1px solid ${C.blue}` }}>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:C.blue, letterSpacing:2.5, marginBottom:10 }}>✨ ONE-LINER</div>
                      <div style={{ fontSize:16, fontStyle:"italic", color:"#c8e8d8", lineHeight:1.7 }}>"{summary.oneLiner}"</div>
                    </div>
                    <SCard title="📝 Summary">
                      <p style={{ fontSize:13.5, lineHeight:1.85, color:C.dim, margin:0 }}>{summary.paragraph}</p>
                    </SCard>
                    <SCard title="📌 Key Points">
                      {summary.bulletPoints?.map((p,i) => <BRow key={i} icon="•" color={C.blue} text={p} />)}
                    </SCard>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                      <SCard title="💡 Study Tips">
                        {summary.studyTips?.map((t,i) => <BRow key={i} icon="→" color={C.green} text={t} />)}
                      </SCard>
                      <SCard title="🔗 Related Topics">
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                          {summary.relatedTopics?.map((t,i) => (
                            <span key={i} style={{ padding:"6px 13px", borderRadius:20, background:"#08101e", border:`1px solid #1a2a4a`, fontSize:12, color:C.blue }}>{t}</span>
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

// ── Shared UI Components ──────────────────────────────────────
function STitle({ children, color }) {
  return <div style={{ fontSize:20, color: color || "#4285F4", marginBottom:20, fontWeight:700 }}>{children}</div>;
}
function Empty({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"70px 20px" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>{icon}</div>
      <div style={{ fontSize:14, maxWidth:340, margin:"0 auto", lineHeight:1.8, color:"#4a4868" }}>{text}</div>
    </div>
  );
}
function Spin({ text, color }) {
  return (
    <div style={{ textAlign:"center", padding:"70px 20px" }}>
      <div style={{ fontSize:38, marginBottom:14, display:"inline-block", animation:"spin 2s linear infinite" }}>⚙️</div>
      <div style={{ fontSize:14, color: color || "#4285F4" }}>{text}</div>
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
      <div style={{ fontSize:12.5, fontWeight:700, color:"#3a7a5a", marginBottom:12 }}>{title}</div>
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
