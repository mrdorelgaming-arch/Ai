// ============================================================
//  StudyGenie — AI Study Assistant
//  Built with React + Google Gemini 2.0 Flash API
//  Design: Google Material You · Gemini branding
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";

// ── Gemini API caller ─────────────────────────────────────────
async function callGemini(apiKey, system, userMsg, history = []) {
  const contents = [
    ...history.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMsg }] },
  ];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Gemini API error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

function parseJSON(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()); }
  catch { return null; }
}

// ── Google color tokens ───────────────────────────────────────
const G = {
  blue:   "#1a73e8",
  blue2:  "#4285f4",
  green:  "#34a853",
  yellow: "#fbbc04",
  red:    "#ea4335",
  bg:     "#0f0f13",
  surf:   "#1a1a22",
  surf2:  "#22222e",
  surf3:  "#2a2a38",
  border: "#2e2e3e",
  text:   "#e8eaf6",
  dim:    "#9e9eb8",
  muted:  "#5a5a78",
  white:  "#ffffff",
};

const FEATURES = [
  { id: 0, icon: "📊", label: "Analyze",   desc: "Deep content breakdown"   },
  { id: 1, icon: "🧩", label: "Quiz",      desc: "Test your knowledge"       },
  { id: 2, icon: "💬", label: "Chat",      desc: "Ask anything"              },
  { id: 3, icon: "📝", label: "Summary",   desc: "Smart study notes"         },
  { id: 4, icon: "🗺️",  label: "Mindmap",  desc: "Visual concept map"        },
  { id: 5, icon: "🔥", label: "Flashcards",desc: "Quick memory cards"        },
];

export default function App() {
  const [apiKey,       setApiKey      ] = useState(() => sessionStorage.getItem("g_api_key") || "");
  const [keyDraft,     setKeyDraft    ] = useState(() => sessionStorage.getItem("g_api_key") || "");
  const [showKey,      setShowKey     ] = useState(false);
  const [keyError,     setKeyError    ] = useState("");
  const [tab,          setTab         ] = useState(0);
  const [content,      setContent     ] = useState("");
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState("");

  // Feature states
  const [analysis,     setAnalysis    ] = useState(null);
  const [quiz,         setQuiz        ] = useState([]);
  const [selected,     setSelected    ] = useState({});
  const [submitted,    setSubmitted   ] = useState(false);
  const [score,        setScore       ] = useState(0);
  const [messages,     setMessages    ] = useState([]);
  const [chatInput,    setChatInput   ] = useState("");
  const [summary,      setSummary     ] = useState(null);
  const [mindmap,      setMindmap     ] = useState(null);
  const [flashcards,   setFlashcards  ] = useState([]);
  const [cardIndex,    setCardIndex   ] = useState(0);
  const [cardFlipped,  setCardFlipped ] = useState(false);

  const chatEndRef  = useRef(null);
  const hasContent  = content.trim().length > 20;
  const hasKey      = apiKey.length > 10;
  const canRun      = hasContent && hasKey;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function saveKey() {
    const k = keyDraft.trim();
    if (k.length < 15) { setKeyError("Enter a valid Google AI key (starts with AIza...)"); return; }
    setApiKey(k);
    sessionStorage.setItem("g_api_key", k);
    setKeyError("");
  }

  function removeKey() {
    setApiKey(""); setKeyDraft("");
    sessionStorage.removeItem("g_api_key");
  }

  async function run(fn) {
    setLoading(true); setError("");
    try { await fn(); }
    catch (e) { setError(e.message || "Something went wrong. Check your API key."); }
    finally { setLoading(false); }
  }

  // ── ANALYZE ──────────────────────────────────────────────
  async function doAnalyze() {
    setTab(0);
    await run(async () => {
      const sys = `You are an expert academic analyzer. Return ONLY valid JSON, no markdown:
{"title":"string","subject":"string","difficulty":"Beginner|Intermediate|Advanced","overview":"string","keyPoints":["string"],"concepts":[{"term":"string","definition":"string"}],"applications":["string"],"readingTime":"string","examTips":["string"]}`;
      const raw = await callGemini(apiKey, sys, "Deeply analyze this study content:\n\n" + content);
      const result = parseJSON(raw);
      if (!result) throw new Error("Could not parse response. Try again.");
      setAnalysis(result);
    });
  }

  // ── QUIZ ────────────────────────────────────────────────
  async function doQuiz() {
    setTab(1);
    await run(async () => {
      const sys = `You are an expert quiz creator. Return ONLY a valid JSON array, no markdown:
[{"question":"string","options":["A) text","B) text","C) text","D) text"],"answer":"A"|"B"|"C"|"D","explanation":"string","difficulty":"Easy|Medium|Hard"}]`;
      const raw = await callGemini(apiKey, sys, "Generate 6 varied multiple-choice questions on:\n\n" + content);
      const q = parseJSON(raw);
      if (!Array.isArray(q)) throw new Error("Could not generate quiz. Try again.");
      setQuiz(q); setSelected({}); setSubmitted(false);
    });
  }

  function submitQuiz() {
    let s = 0;
    quiz.forEach((q, i) => { if (selected[i] === q.answer) s++; });
    setScore(s); setSubmitted(true);
  }

  // ── CHAT ────────────────────────────────────────────────
  async function doChat() {
    if (!chatInput.trim() || !hasKey) return;
    const msg = chatInput.trim();
    const updated = [...messages, { role: "user", content: msg }];
    setMessages(updated); setChatInput(""); setLoading(true); setError("");
    try {
      const sys = `You are StudyGenie, a brilliant and friendly AI tutor powered by Google Gemini. The student is studying:\n\n${content || "(No specific material — answer general questions)"}\n\nBe clear, encouraging, and use examples. Format answers with line breaks for readability.`;
      const hist = updated.slice(0, -1);
      const reply = await callGemini(apiKey, sys, msg, hist);
      setMessages([...updated, { role: "assistant", content: reply || "No response received." }]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  // ── SUMMARY ─────────────────────────────────────────────
  async function doSummary() {
    setTab(3);
    await run(async () => {
      const sys = `You are a professional academic summarizer. Return ONLY valid JSON, no markdown:
{"oneLiner":"string","tldr":"string","keyPoints":["string"],"studyTips":["string"],"relatedTopics":["string"],"difficulty":"string","estimatedStudyTime":"string"}`;
      const raw = await callGemini(apiKey, sys, "Create a comprehensive study summary:\n\n" + content);
      const result = parseJSON(raw);
      if (!result) throw new Error("Could not generate summary. Try again.");
      setSummary(result);
    });
  }

  // ── MINDMAP ─────────────────────────────────────────────
  async function doMindmap() {
    setTab(4);
    await run(async () => {
      const sys = `You are a concept mapping expert. Return ONLY valid JSON, no markdown:
{"central":"string","branches":[{"topic":"string","color":"string","subtopics":["string"]}]}
Use 5-6 branches. Colors must be from: #4285f4,#34a853,#fbbc04,#ea4335,#9c27b0,#00bcd4`;
      const raw = await callGemini(apiKey, sys, "Create a detailed mind map for:\n\n" + content);
      const result = parseJSON(raw);
      if (!result) throw new Error("Could not generate mind map. Try again.");
      setMindmap(result);
    });
  }

  // ── FLASHCARDS ──────────────────────────────────────────
  async function doFlashcards() {
    setTab(5);
    await run(async () => {
      const sys = `You are a flashcard expert. Return ONLY a valid JSON array, no markdown:
[{"front":"string","back":"string","category":"string"}]
Generate 10 flashcards covering key terms, concepts, and facts.`;
      const raw = await callGemini(apiKey, sys, "Create flashcards from:\n\n" + content);
      const result = parseJSON(raw);
      if (!Array.isArray(result)) throw new Error("Could not generate flashcards. Try again.");
      setFlashcards(result); setCardIndex(0); setCardFlipped(false);
    });
  }

  return (
    <div style={{ minHeight:"100vh", background:G.bg, color:G.text, fontFamily:"'Google Sans',sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${G.surf}; }
        ::-webkit-scrollbar-thumb { background: ${G.border}; border-radius: 4px; }
        .btn-goog { transition: all .18s ease; }
        .btn-goog:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn-goog:active { transform: translateY(0); }
        .card-flip { transition: transform 0.5s ease; transform-style: preserve-3d; }
        .card-flip.flipped { transform: rotateY(180deg); }
        .card-front, .card-back { backface-visibility: hidden; }
        .card-back { transform: rotateY(180deg); }
        .feat-btn { transition: all .2s ease; cursor: pointer; }
        .feat-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(66,133,244,.25); }
        .tab-btn { transition: all .18s ease; }
        .tab-btn:hover { background: ${G.surf3} !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes gradMove { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        .anim-fade { animation: fadeUp .4s ease forwards; }
        .thinking-dot { width:8px; height:8px; border-radius:50%; animation: pulse 1.4s ease infinite; }
      `}</style>

      {/* ── TOP HEADER ── */}
      <header style={{ background:"linear-gradient(135deg,#0d1117,#0f1a2e,#0d1a15)", borderBottom:`1px solid ${G.border}`, padding:"0 28px", height:64, display:"flex", alignItems:"center", gap:16, flexShrink:0, position:"sticky", top:0, zIndex:100 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#4285f4,#34a853)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>✦</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, background:"linear-gradient(90deg,#4285f4,#34a853,#fbbc04)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundSize:"200%", animation:"gradMove 4s ease infinite" }}>StudyGenie</div>
            <div style={{ fontSize:10, color:G.muted, letterSpacing:1, marginTop:-1 }}>POWERED BY GOOGLE GEMINI</div>
          </div>
        </div>

        {/* Gemini badge */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8, padding:"5px 12px", borderRadius:20, background:G.surf2, border:`1px solid ${G.border}` }}>
          <span style={{ fontSize:13 }}>✦</span>
          <span style={{ fontSize:11, color:G.dim, fontFamily:"monospace" }}>Gemini 2.0 Flash</span>
        </div>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
          {/* Key status */}
          {hasKey ? (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:20, background:"#0d2010", border:`1px solid ${G.green}40` }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:G.green }}/>
              <span style={{ fontSize:11, color:G.green, fontFamily:"monospace" }}>{apiKey.slice(0,8)}…{apiKey.slice(-4)}</span>
              <button onClick={removeKey} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:12, padding:"0 2px" }}>✕</button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ position:"relative" }}>
                <input type={showKey?"text":"password"} value={keyDraft} onChange={e=>setKeyDraft(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&saveKey()}
                  placeholder="AIza... Google AI Key"
                  style={{ padding:"8px 36px 8px 12px", background:G.surf2, border:`1px solid ${keyError?G.red:G.border}`, borderRadius:10, color:G.text, fontSize:12, fontFamily:"monospace", outline:"none", width:220 }}/>
                <button onClick={()=>setShowKey(v=>!v)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:G.muted, fontSize:13 }}>{showKey?"🙈":"👁"}</button>
              </div>
              <button onClick={saveKey} className="btn-goog" style={{ padding:"8px 16px", borderRadius:10, background:"linear-gradient(135deg,#4285f4,#1a73e8)", border:"none", color:G.white, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Connect
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── KEY ERROR ── */}
      {keyError && (
        <div style={{ background:"#1a0808", borderBottom:`1px solid ${G.red}40`, padding:"10px 28px", fontSize:12, color:"#f87171", display:"flex", justifyContent:"space-between" }}>
          <span>⚠️ {keyError}</span>
          <button onClick={()=>setKeyError("")} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* ── API ERROR ── */}
      {error && (
        <div style={{ background:"#1a0808", borderBottom:`1px solid ${G.red}40`, padding:"10px 28px", fontSize:12, color:"#f87171", display:"flex", justifyContent:"space-between" }}>
          <span>⚠️ {error}</span>
          <button onClick={()=>setError("")} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* ── NO KEY BANNER ── */}
      {!hasKey && (
        <div style={{ background:"linear-gradient(135deg,#0d1a2e,#0d2010)", borderBottom:`1px solid ${G.blue2}20`, padding:"14px 28px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <span style={{ fontSize:20 }}>🔑</span>
          <div>
            <div style={{ fontSize:13, color:G.text, fontWeight:500 }}>Connect your Google AI API Key to get started</div>
            <div style={{ fontSize:11, color:G.muted, marginTop:2 }}>Free key at <span style={{ color:G.blue2, fontWeight:600 }}>aistudio.google.com/app/apikey</span> — no payment required</div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ width:280, flexShrink:0, background:G.surf, borderRight:`1px solid ${G.border}`, display:"flex", flexDirection:"column", overflowY:"auto" }}>

          {/* Content input */}
          <div style={{ padding:"20px 16px 12px" }}>
            <div style={{ fontSize:10, color:G.muted, fontFamily:"monospace", letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Study Material</div>
            <textarea value={content} onChange={e=>setContent(e.target.value)}
              placeholder={"Paste anything here...\n\n• Textbook chapters\n• Lecture notes\n• Research papers\n• YouTube transcript\n• Any topic to study"}
              style={{ width:"100%", minHeight:240, padding:"12px", background:G.surf2, border:`1px solid ${G.border}`, borderRadius:12, color:G.text, fontSize:12.5, fontFamily:"'Google Sans',sans-serif", outline:"none", resize:"none", lineHeight:1.8, transition:"border .2s" }}
              onFocus={e=>e.target.style.borderColor=G.blue2}
              onBlur={e=>e.target.style.borderColor=G.border}
            />
            {content && (
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:G.muted }}>
                <span>{content.split(/\s+/).filter(Boolean).length} words</span>
                <span>{content.length} chars</span>
              </div>
            )}
          </div>

          {/* Feature buttons */}
          <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:10, color:G.muted, fontFamily:"monospace", letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Features</div>
            {[
              { label:"📊 Analyze Content",  fn: doAnalyze,    t:0, color:G.blue2 },
              { label:"🧩 Generate Quiz",    fn: doQuiz,       t:1, color:G.green },
              { label:"📝 Smart Summary",    fn: doSummary,    t:3, color:G.yellow },
              { label:"🗺️ Mind Map",          fn: doMindmap,    t:4, color:"#9c27b0" },
              { label:"🔥 Flashcards",       fn: doFlashcards, t:5, color:G.red },
            ].map((b,i) => (
              <button key={i} onClick={b.fn} disabled={!canRun} className="btn-goog"
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${canRun?b.color+"40":G.border}`,
                  background: canRun ? `linear-gradient(135deg,${b.color}15,${b.color}08)` : G.surf2,
                  color: canRun ? b.color : G.muted, fontSize:12.5, fontWeight:500,
                  cursor: canRun ? "pointer" : "not-allowed", textAlign:"left", transition:"all .2s",
                  opacity: canRun ? 1 : 0.5 }}>
                {b.label}
              </button>
            ))}
            <button onClick={()=>setTab(2)} disabled={!hasKey} className="btn-goog"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${hasKey?"#00bcd440":G.border}`,
                background: hasKey ? "linear-gradient(135deg,#00bcd415,#00bcd408)" : G.surf2,
                color: hasKey ? "#00bcd4" : G.muted, fontSize:12.5, fontWeight:500,
                cursor: hasKey ? "pointer" : "not-allowed", textAlign:"left", opacity: hasKey ? 1 : 0.5 }}>
              💬 AI Tutor Chat
            </button>
          </div>

          {/* Tip box */}
          <div style={{ margin:"0 16px 16px", padding:"12px", borderRadius:10, background:G.surf2, border:`1px solid ${G.border}`, fontSize:11.5, color:G.muted, lineHeight:1.7 }}>
            <div style={{ color:G.blue2, fontWeight:600, marginBottom:4 }}>✦ Tip</div>
            {!hasKey ? "Enter your free Google AI key above to unlock all features." :
             !hasContent ? "Paste study material to enable AI analysis features." :
             "All features ready! Click any button to get started."}
          </div>

          {/* Footer badge */}
          <div style={{ marginTop:"auto", padding:"12px 16px", borderTop:`1px solid ${G.border}`, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:10, color:G.muted }}>Powered by</div>
            <div style={{ fontSize:12, fontWeight:700, background:"linear-gradient(90deg,#4285f4,#34a853,#fbbc04,#ea4335)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Google Gemini</div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Tab bar */}
          <div style={{ display:"flex", borderBottom:`1px solid ${G.border}`, background:G.surf, flexShrink:0, overflowX:"auto", padding:"0 8px" }}>
            {FEATURES.map((f,i) => (
              <button key={i} onClick={()=>setTab(i)} className="tab-btn"
                style={{ padding:"16px 20px", background:"none", border:"none", borderBottom:`2px solid ${tab===i?G.blue2:"transparent"}`,
                  color: tab===i ? G.blue2 : G.muted, fontSize:12.5, cursor:"pointer",
                  fontFamily:"'Google Sans',sans-serif", fontWeight: tab===i ? 600 : 400,
                  whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, transition:"all .18s",
                  borderRadius:"8px 8px 0 0" }}>
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>

            {/* Loading state */}
            {loading && tab !== 2 && (
              <div style={{ textAlign:"center", padding:"80px 20px", animation:"fadeUp .3s ease" }}>
                <div style={{ width:48, height:48, borderRadius:"50%", border:`3px solid ${G.border}`, borderTop:`3px solid ${G.blue2}`, animation:"spin 1s linear infinite", margin:"0 auto 20px" }}/>
                <div style={{ fontSize:15, color:G.dim }}>Gemini is thinking...</div>
                <div style={{ fontSize:12, color:G.muted, marginTop:6 }}>Powered by Google AI</div>
              </div>
            )}

            {/* ── ANALYZE ── */}
            {tab === 0 && !loading && (
              <div className="anim-fade">
                <PageTitle icon="📊" title="Content Analysis" sub="AI-powered breakdown of your study material" color={G.blue2} />
                {!analysis ? (
                  <EmptyState icon="📊" text="Paste your study material and click Analyze Content" color={G.blue2} />
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                    {/* Header card */}
                    <div style={{ padding:"22px 24px", borderRadius:16, background:`linear-gradient(135deg,${G.blue2}15,${G.green}10)`, border:`1px solid ${G.blue2}30` }}>
                      <div style={{ fontSize:20, fontWeight:700, color:G.text, marginBottom:8 }}>{analysis.title}</div>
                      <div style={{ fontSize:13, color:G.dim, lineHeight:1.7 }}>{analysis.overview}</div>
                      <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}>
                        <Chip label={analysis.subject} color={G.blue2} />
                        <Chip label={analysis.difficulty} color={analysis.difficulty==="Beginner"?G.green:analysis.difficulty==="Intermediate"?G.yellow:G.red} />
                        <Chip label={`⏱ ${analysis.readingTime}`} color={G.muted} />
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <InfoCard title="📌 Key Points" color={G.blue2}>
                        {analysis.keyPoints?.map((p,i) => <BulletRow key={i} text={p} color={G.blue2} />)}
                      </InfoCard>
                      <InfoCard title="🎯 Exam Tips" color={G.green}>
                        {analysis.examTips?.map((t,i) => <BulletRow key={i} text={t} color={G.green} />)}
                      </InfoCard>
                    </div>
                    <InfoCard title="🔑 Key Concepts" color={G.yellow}>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10, marginTop:4 }}>
                        {analysis.concepts?.map((c,i) => (
                          <div key={i} style={{ padding:"12px 14px", borderRadius:10, background:G.bg, border:`1px solid ${G.border}` }}>
                            <div style={{ fontSize:12.5, fontWeight:600, color:G.yellow, marginBottom:4 }}>{c.term}</div>
                            <div style={{ fontSize:11.5, color:G.muted, lineHeight:1.55 }}>{c.definition}</div>
                          </div>
                        ))}
                      </div>
                    </InfoCard>
                    <InfoCard title="⚡ Real-World Applications" color="#9c27b0">
                      {analysis.applications?.map((a,i) => <BulletRow key={i} text={a} color="#9c27b0" />)}
                    </InfoCard>
                  </div>
                )}
              </div>
            )}

            {/* ── QUIZ ── */}
            {tab === 1 && !loading && (
              <div className="anim-fade">
                <PageTitle icon="🧩" title="Knowledge Quiz" sub="Test yourself with AI-generated questions" color={G.green} />
                {quiz.length === 0 ? (
                  <EmptyState icon="🧩" text="Paste your material and click Generate Quiz" color={G.green} />
                ) : (
                  <div>
                    {submitted && (
                      <div style={{ padding:24, borderRadius:16, textAlign:"center", marginBottom:24,
                        background: score>=5?"linear-gradient(135deg,#062006,#081408)":score>=3?"linear-gradient(135deg,#1a1200,#0a1000)":"linear-gradient(135deg,#1a0606,#0a0808)",
                        border:`1px solid ${score>=5?G.green:score>=3?G.yellow:G.red}40` }}>
                        <div style={{ fontSize:48, marginBottom:8 }}>{score===6?"🏆":score>=5?"🥇":score>=3?"🌟":"📚"}</div>
                        <div style={{ fontSize:32, fontWeight:700, color:score>=5?G.green:score>=3?G.yellow:G.red }}>{score} / {quiz.length}</div>
                        <div style={{ fontSize:13, color:G.dim, marginTop:6 }}>{score===quiz.length?"Perfect score! Outstanding!":score>=quiz.length*0.7?"Great job! Almost there.":"Keep studying and try again!"}</div>
                        <button onClick={doQuiz} className="btn-goog" style={{ marginTop:16, padding:"10px 24px", borderRadius:10, background:`linear-gradient(135deg,${G.blue2},${G.green})`, border:"none", color:G.white, cursor:"pointer", fontFamily:"'Google Sans',sans-serif", fontSize:13, fontWeight:600 }}>🔄 New Quiz</button>
                      </div>
                    )}
                    {quiz.map((q,qi) => {
                      const ok  = submitted && selected[qi]===q.answer;
                      const bad = submitted && selected[qi] && selected[qi]!==q.answer;
                      return (
                        <div key={qi} style={{ marginBottom:16, padding:20, borderRadius:14, background:G.surf, border:`1px solid ${submitted?(ok?G.green:bad?G.red:G.border):G.border}`, transition:"border .2s" }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:14 }}>
                            <span style={{ padding:"3px 9px", borderRadius:6, background:G.surf2, fontSize:11, color:G.blue2, fontWeight:700, flexShrink:0 }}>Q{qi+1}</span>
                            <div style={{ fontSize:13.5, fontWeight:500, color:G.text, lineHeight:1.6 }}>{q.question}</div>
                            <span style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:6, background:G.surf2, fontSize:10, color:q.difficulty==="Easy"?G.green:q.difficulty==="Hard"?G.red:G.yellow, flexShrink:0 }}>{q.difficulty}</span>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                            {q.options.map((opt,oi) => {
                              const l=["A","B","C","D"][oi];
                              const isSel=selected[qi]===l;
                              const showOk=submitted&&l===q.answer;
                              const showBad=submitted&&isSel&&l!==q.answer;
                              return (
                                <div key={oi} onClick={()=>!submitted&&setSelected(s=>({...s,[qi]:l}))}
                                  style={{ padding:"10px 14px", borderRadius:10, fontSize:12.5, cursor:submitted?"default":"pointer", userSelect:"none", transition:"all .15s",
                                    background:showOk?"#062006":showBad?"#200606":isSel?`${G.blue2}15`:G.surf2,
                                    border:`1px solid ${showOk?G.green:showBad?G.red:isSel?G.blue2:G.border}`,
                                    color:G.dim, display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontWeight:700, color:showOk?G.green:showBad?G.red:isSel?G.blue2:G.muted, fontSize:12 }}>{l}</span>
                                  {opt.replace(/^[A-D]\)\s*/,"")}
                                  {showOk && <span style={{ marginLeft:"auto", color:G.green, fontSize:14 }}>✓</span>}
                                  {showBad && <span style={{ marginLeft:"auto", color:G.red, fontSize:14 }}>✗</span>}
                                </div>
                              );
                            })}
                          </div>
                          {submitted && (
                            <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, background:G.bg, border:`1px solid ${G.border}`, fontSize:12, color:G.muted, lineHeight:1.6 }}>
                              <span style={{ color:G.green, fontWeight:600 }}>💡 </span>{q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!submitted && (
                      <button onClick={submitQuiz} disabled={Object.keys(selected).length < quiz.length} className="btn-goog"
                        style={{ width:"100%", padding:16, borderRadius:12, border:"none", fontFamily:"'Google Sans',sans-serif", fontWeight:600, fontSize:15,
                          background:Object.keys(selected).length===quiz.length?`linear-gradient(135deg,${G.blue2},${G.green})`:G.surf2,
                          color:Object.keys(selected).length===quiz.length?G.white:G.muted,
                          cursor:Object.keys(selected).length===quiz.length?"pointer":"not-allowed" }}>
                        Submit Quiz ({Object.keys(selected).length}/{quiz.length} answered)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CHAT ── */}
            {tab === 2 && (
              <div className="anim-fade" style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 180px)" }}>
                <PageTitle icon="💬" title="AI Tutor Chat" sub="Ask Gemini anything about your material" color="#00bcd4" />
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, paddingBottom:8 }}>
                  {messages.length===0 && (
                    <div style={{ textAlign:"center", padding:"60px 20px" }}>
                      <div style={{ fontSize:48, marginBottom:16 }}>✦</div>
                      <div style={{ fontSize:16, color:G.dim, fontWeight:500 }}>Your Gemini AI Tutor is ready</div>
                      <div style={{ fontSize:12, color:G.muted, marginTop:8, lineHeight:1.7 }}>
                        "Explain the main concepts" · "What might be on the exam?" · "Give me an example"
                      </div>
                      <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:16, flexWrap:"wrap" }}>
                        {["Summarize this","Key formulas","Give me examples","What's important?"].map((s,i) => (
                          <button key={i} onClick={()=>{setChatInput(s);}} className="btn-goog"
                            style={{ padding:"7px 14px", borderRadius:20, background:G.surf2, border:`1px solid ${G.border}`, color:G.dim, fontSize:12, cursor:"pointer" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"fadeUp .3s ease" }}>
                      {m.role==="assistant" && (
                        <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#4285f4,#34a853)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, marginRight:10, marginTop:2 }}>✦</div>
                      )}
                      <div style={{ maxWidth:"72%", padding:"13px 16px",
                        borderRadius: m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                        background: m.role==="user"?`linear-gradient(135deg,${G.blue2}20,${G.blue}15)`:G.surf,
                        border:`1px solid ${m.role==="user"?G.blue2+"30":G.border}`,
                        fontSize:13, lineHeight:1.75, color:G.dim }}>
                        {m.role==="assistant" && <div style={{ fontSize:10, color:"#00bcd4", fontFamily:"monospace", marginBottom:6, letterSpacing:1 }}>STUDYGENIE · GEMINI</div>}
                        {m.content.split('\n').map((ln,li,arr) => <span key={li}>{ln}{li<arr.length-1&&<br/>}</span>)}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#4285f4,#34a853)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>✦</div>
                      <div style={{ display:"flex", gap:5, padding:"12px 16px", borderRadius:"16px 16px 16px 4px", background:G.surf, border:`1px solid ${G.border}` }}>
                        {[0,1,2].map(i => <div key={i} className="thinking-dot" style={{ background:G.blue2, animationDelay:`${i*.2}s` }}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{ display:"flex", gap:10, paddingTop:14, borderTop:`1px solid ${G.border}` }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&doChat()}
                    placeholder={hasKey?"Ask your AI tutor anything... (Enter to send)":"Set your Google API key to start chatting"}
                    disabled={!hasKey}
                    style={{ flex:1, padding:"13px 16px", background:G.surf2, border:`1px solid ${G.border}`, borderRadius:12, color:G.text, fontSize:13, fontFamily:"'Google Sans',sans-serif", outline:"none", opacity:hasKey?1:0.5, transition:"border .2s" }}
                    onFocus={e=>e.target.style.borderColor=G.blue2}
                    onBlur={e=>e.target.style.borderColor=G.border}
                  />
                  <button onClick={doChat} disabled={!chatInput.trim()||loading||!hasKey} className="btn-goog"
                    style={{ padding:"13px 20px", borderRadius:12, border:"none", fontSize:18,
                      background:chatInput.trim()&&hasKey?`linear-gradient(135deg,${G.blue2},${G.green})`:G.surf2,
                      color:chatInput.trim()&&hasKey?G.white:G.muted,
                      cursor:chatInput.trim()&&hasKey?"pointer":"not-allowed" }}>➤</button>
                </div>
              </div>
            )}

            {/* ── SUMMARY ── */}
            {tab === 3 && !loading && (
              <div className="anim-fade">
                <PageTitle icon="📝" title="Smart Summary" sub="AI-generated study notes and insights" color={G.yellow} />
                {!summary ? (
                  <EmptyState icon="📝" text="Paste your material and click Smart Summary" color={G.yellow} />
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div style={{ padding:"22px 24px", borderRadius:16, background:`linear-gradient(135deg,#1a1200,#0a1000)`, border:`1px solid ${G.yellow}40` }}>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:G.yellow, letterSpacing:2, marginBottom:8 }}>✦ ONE-LINER</div>
                      <div style={{ fontSize:17, fontStyle:"italic", color:G.text, lineHeight:1.7 }}>"{summary.oneLiner}"</div>
                    </div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <Chip label={`📚 ${summary.difficulty}`} color={G.yellow} />
                      <Chip label={`⏱ ${summary.estimatedStudyTime}`} color={G.green} />
                    </div>
                    <InfoCard title="📋 TL;DR" color={G.blue2}>
                      <p style={{ fontSize:13.5, lineHeight:1.85, color:G.dim, margin:0 }}>{summary.tldr}</p>
                    </InfoCard>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <InfoCard title="📌 Key Points" color={G.yellow}>
                        {summary.keyPoints?.map((p,i) => <BulletRow key={i} text={p} color={G.yellow} />)}
                      </InfoCard>
                      <InfoCard title="💡 Study Tips" color={G.green}>
                        {summary.studyTips?.map((t,i) => <BulletRow key={i} text={t} color={G.green} />)}
                      </InfoCard>
                    </div>
                    <InfoCard title="🔗 Related Topics" color="#9c27b0">
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
                        {summary.relatedTopics?.map((t,i) => <Chip key={i} label={t} color="#9c27b0" />)}
                      </div>
                    </InfoCard>
                  </div>
                )}
              </div>
            )}

            {/* ── MINDMAP ── */}
            {tab === 4 && !loading && (
              <div className="anim-fade">
                <PageTitle icon="🗺️" title="Mind Map" sub="Visual concept map of your material" color="#9c27b0" />
                {!mindmap ? (
                  <EmptyState icon="🗺️" text="Paste your material and click Mind Map" color="#9c27b0" />
                ) : (
                  <div>
                    {/* Central node */}
                    <div style={{ textAlign:"center", marginBottom:28 }}>
                      <div style={{ display:"inline-block", padding:"16px 28px", borderRadius:20, background:"linear-gradient(135deg,#4285f4,#34a853)", fontSize:17, fontWeight:700, color:G.white, boxShadow:"0 8px 30px rgba(66,133,244,.4)" }}>
                        ✦ {mindmap.central}
                      </div>
                    </div>
                    {/* Branches */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                      {mindmap.branches?.map((branch, i) => (
                        <div key={i} style={{ padding:"16px", borderRadius:14, background:G.surf, border:`1px solid ${branch.color}40` }}>
                          <div style={{ fontSize:14, fontWeight:700, color:branch.color, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:10, height:10, borderRadius:"50%", background:branch.color, flexShrink:0 }}/>
                            {branch.topic}
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {branch.subtopics?.map((s,j) => (
                              <div key={j} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                                <div style={{ width:5, height:5, borderRadius:"50%", background:branch.color+"80", flexShrink:0, marginTop:6 }}/>
                                <div style={{ fontSize:12.5, color:G.dim, lineHeight:1.55 }}>{s}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── FLASHCARDS ── */}
            {tab === 5 && !loading && (
              <div className="anim-fade">
                <PageTitle icon="🔥" title="Flashcards" sub="Tap a card to reveal the answer" color={G.red} />
                {flashcards.length === 0 ? (
                  <EmptyState icon="🔥" text="Paste your material and click Flashcards" color={G.red} />
                ) : (
                  <div>
                    {/* Progress */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                      <div style={{ fontSize:13, color:G.muted }}>Card {cardIndex+1} of {flashcards.length}</div>
                      <div style={{ fontSize:11, color:G.muted, padding:"4px 10px", borderRadius:8, background:G.surf2, border:`1px solid ${G.border}` }}>
                        {flashcards[cardIndex]?.category}
                      </div>
                    </div>
                    <div style={{ width:"100%", height:8, background:G.surf2, borderRadius:4, marginBottom:28, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg,${G.red},${G.yellow})`, width:`${((cardIndex+1)/flashcards.length)*100}%`, transition:"width .3s ease" }}/>
                    </div>

                    {/* Card */}
                    <div onClick={()=>setCardFlipped(v=>!v)} style={{ cursor:"pointer", perspective:"1000px", maxWidth:600, margin:"0 auto" }}>
                      <div style={{ position:"relative", height:220, transformStyle:"preserve-3d", transition:"transform .5s ease", transform:cardFlipped?"rotateY(180deg)":"rotateY(0deg)" }}>
                        {/* Front */}
                        <div style={{ position:"absolute", width:"100%", height:"100%", backfaceVisibility:"hidden", padding:30, borderRadius:20, background:`linear-gradient(135deg,${G.surf},${G.surf2})`, border:`2px solid ${G.red}40`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
                          <div style={{ fontSize:11, color:G.red, fontFamily:"monospace", letterSpacing:2, marginBottom:12 }}>QUESTION</div>
                          <div style={{ fontSize:16, fontWeight:500, color:G.text, lineHeight:1.6 }}>{flashcards[cardIndex]?.front}</div>
                          <div style={{ fontSize:11, color:G.muted, marginTop:16 }}>tap to reveal →</div>
                        </div>
                        {/* Back */}
                        <div style={{ position:"absolute", width:"100%", height:"100%", backfaceVisibility:"hidden", transform:"rotateY(180deg)", padding:30, borderRadius:20, background:`linear-gradient(135deg,#062006,#081408)`, border:`2px solid ${G.green}40`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
                          <div style={{ fontSize:11, color:G.green, fontFamily:"monospace", letterSpacing:2, marginBottom:12 }}>ANSWER</div>
                          <div style={{ fontSize:15, color:G.text, lineHeight:1.7 }}>{flashcards[cardIndex]?.back}</div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:12, marginTop:28 }}>
                      <button onClick={()=>{setCardIndex(i=>Math.max(0,i-1));setCardFlipped(false);}} disabled={cardIndex===0} className="btn-goog"
                        style={{ padding:"10px 22px", borderRadius:10, background:cardIndex>0?G.surf2:G.surf, border:`1px solid ${G.border}`, color:cardIndex>0?G.dim:G.muted, cursor:cardIndex>0?"pointer":"not-allowed", fontFamily:"'Google Sans',sans-serif", fontSize:13 }}>
                        ← Prev
                      </button>
                      <div style={{ display:"flex", gap:6 }}>
                        {flashcards.map((_,i) => (
                          <div key={i} onClick={()=>{setCardIndex(i);setCardFlipped(false);}} style={{ width:i===cardIndex?20:7, height:7, borderRadius:4, background:i===cardIndex?G.red:G.border, cursor:"pointer", transition:"all .2s" }}/>
                        ))}
                      </div>
                      <button onClick={()=>{setCardIndex(i=>Math.min(flashcards.length-1,i+1));setCardFlipped(false);}} disabled={cardIndex===flashcards.length-1} className="btn-goog"
                        style={{ padding:"10px 22px", borderRadius:10, background:cardIndex<flashcards.length-1?G.surf2:G.surf, border:`1px solid ${G.border}`, color:cardIndex<flashcards.length-1?G.dim:G.muted, cursor:cardIndex<flashcards.length-1?"pointer":"not-allowed", fontFamily:"'Google Sans',sans-serif", fontSize:13 }}>
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

// ── Shared UI Components ──────────────────────────────────────
function PageTitle({ icon, title, sub, color }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:22, fontWeight:700, color, display:"flex", alignItems:"center", gap:10 }}>
        <span>{icon}</span>{title}
      </div>
      <div style={{ fontSize:12.5, color:"#5a5a78", marginTop:4 }}>{sub}</div>
    </div>
  );
}
function EmptyState({ icon, text, color }) {
  return (
    <div style={{ textAlign:"center", padding:"80px 20px" }}>
      <div style={{ fontSize:56, marginBottom:16, opacity:.6 }}>{icon}</div>
      <div style={{ fontSize:14, color:"#4a4868", maxWidth:320, margin:"0 auto", lineHeight:1.8 }}>{text}</div>
    </div>
  );
}
function Chip({ label, color }) {
  return (
    <span style={{ padding:"5px 12px", borderRadius:20, background:`${color}15`, border:`1px solid ${color}40`, fontSize:12, color, fontWeight:500 }}>{label}</span>
  );
}
function InfoCard({ title, children, color }) {
  return (
    <div style={{ padding:"18px 20px", borderRadius:14, background:"#1a1a22", border:"1px solid #2e2e3e" }}>
      <div style={{ fontSize:12.5, fontWeight:700, color, marginBottom:12 }}>{title}</div>
      {children}
    </div>
  );
}
function BulletRow({ text, color }) {
  return (
    <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0, marginTop:6 }}/>
      <span style={{ fontSize:13, color:"#9e9eb8", lineHeight:1.65 }}>{text}</span>
    </div>
  );
}
