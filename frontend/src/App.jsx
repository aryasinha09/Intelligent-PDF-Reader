import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  const currentSession = sessions.find(s => s.id === activeSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSession]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setAuthError(error.message);
        else setAuthError("✅ Account created! You can now login.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessions([]);
    setActiveSession(null);
  };

  const handleUpload = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) {
      alert("Only PDF files are allowed!");
      return;
    }
    setUploading(true);
    const sessionId = "session_" + Math.random().toString(36).substr(2, 9);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload?session_id=${sessionId}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Backend upload failed");
      await res.json();
      const newMsg = [{ role: "ai", text: `✅ "${file.name}" loaded! Ask me anything 🔍` }];
      const { data, error } = await supabase.from("sessions").insert({
        user_id: user.id,
        pdf_name: file.name,
        messages: newMsg,
        is_archived: false,
      }).select().single();
      if (error) { alert("Database error: " + error.message); return; }
      if (data) {
        setSessions(prev => [{ ...data, backend_session_id: sessionId }, ...prev]);
        setActiveSession(data.id);
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || !currentSession) return;
    const question = input.trim();
    setInput("");
    const backendId = currentSession.backend_session_id;
    if (!backendId) { alert("Session expired! Please upload PDF again."); return; }
    const userMsg = { role: "user", text: question };
    const updatedMsgs = [...currentSession.messages, userMsg];
    setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, messages: updatedMsgs } : s));
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, session_id: backendId }),
      });
      const data = await res.json();
      const aiMsg = { role: "ai", text: data.answer, sources: data.sources };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, messages: finalMsgs } : s));
      await supabase.from("sessions").update({ messages: finalMsgs }).eq("id", currentSession.id);
    } catch {
      const errMsg = { role: "ai", text: "❌ Something went wrong. Please try again." };
      setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, messages: [...updatedMsgs, errMsg] } : s));
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id) => {
    await supabase.from("sessions").delete().eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession === id) setActiveSession(null);
  };

  const archiveSession = async (id) => {
    await supabase.from("sessions").update({ is_archived: true }).eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession === id) setActiveSession(null);
  };

  const exportChat = async () => {
    if (!currentSession) return;
    const { jsPDF } = await import("https://esm.sh/jspdf@2.5.1");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;
    const addText = (text, fontSize, isBold, color) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += fontSize * 0.5;
      });
      y += 4;
    };
    addText("Intelligent PDF Reader — Chat Export", 16, true, [99, 102, 241]);
    addText(`PDF: ${currentSession.pdf_name}`, 11, false, [100, 100, 120]);
    addText(`Exported: ${new Date().toLocaleString()}`, 10, false, [150, 150, 170]);
    y += 4;
    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    currentSession.messages.forEach((msg) => {
      if (msg.role === "ai") {
        addText("AI:", 10, true, [99, 102, 241]);
        addText(msg.text, 10, false, [30, 30, 50]);
        if (msg.sources?.length) addText(`Sources: ${msg.sources.join(", ")}`, 9, false, [120, 120, 150]);
      } else {
        addText("You:", 10, true, [176, 110, 243]);
        addText(msg.text, 10, false, [30, 30, 50]);
      }
      y += 4;
      doc.setDrawColor(230, 230, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    });
    doc.save(`chat-${currentSession.pdf_name?.replace(".pdf", "")}.pdf`);
  };

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="bg-grid" />
        <div className="bg-orb orb1" />
        <div className="bg-orb orb2" />
        <div className="bg-shape shape1" />
        <div className="bg-shape shape2" />
        <div className="bg-shape shape3" />
        <div className="auth-box">
          <div className="auth-logo">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="14" rx="2" fill="#7c6ff7" opacity="0.9"/>
              <rect x="16" y="2" width="10" height="8" rx="2" fill="#7c6ff7" opacity="0.6"/>
              <rect x="16" y="14" width="10" height="12" rx="2" fill="#b06ef3" opacity="0.8"/>
              <rect x="2" y="20" width="10" height="6" rx="2" fill="#b06ef3" opacity="0.5"/>
            </svg>
            <h1>Intelligent PDF Reader</h1>
          </div>
          <p className="auth-subtitle">{authMode === "login" ? "Welcome back!" : "Create your account"}</p>
          <div className="auth-tabs">
            <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button>
            <button className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")}>Sign Up</button>
          </div>
          <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} />
          {authError && <p className="auth-error">{authError}</p>}
          <button className="auth-btn" onClick={handleAuth} disabled={authLoading}>
            {authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Sign Up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="bg-grid" />
      <div className="bg-orb orb1" />
      <div className="bg-orb orb2" />
      <div className="bg-shape shape1" />
      <div className="bg-shape shape2" />
      <div className="bg-shape shape3" />
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-mark">
                <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                  <rect x="2" y="2" width="10" height="14" rx="2" fill="#7c6ff7" opacity="0.9"/>
                  <rect x="16" y="2" width="10" height="8" rx="2" fill="#7c6ff7" opacity="0.6"/>
                  <rect x="16" y="14" width="10" height="12" rx="2" fill="#b06ef3" opacity="0.8"/>
                  <rect x="2" y="20" width="10" height="6" rx="2" fill="#b06ef3" opacity="0.5"/>
                </svg>
              </div>
              <span className="logo-text">PDF Reader</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
          </div>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
          </div>
          <button className="new-chat-btn" onClick={() => fileRef.current.click()} disabled={uploading}>
            <span>+</span> {uploading ? "Uploading..." : "New PDF"}
          </button>
          <div className="sessions-list">
            {sessions.length === 0 && <p className="no-sessions">No PDFs yet — upload one!</p>}
            {sessions.map(s => (
              <div key={s.id} className={`session-item ${s.id === activeSession ? "active" : ""}`} onClick={() => setActiveSession(s.id)}>
                <div className="session-icon">📄</div>
                <div className="session-info">
                  <p className="session-name">{s.pdf_name?.replace(".pdf", "")}</p>
                  <p className="session-time">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div className="session-actions">
                  <button className="session-btn" onClick={(e) => { e.stopPropagation(); archiveSession(s.id); }} title="Archive">📦</button>
                  <button className="session-btn delete" onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} title="Delete">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <main className="main">
          {!currentSession ? (
            <div className={`dropzone ${dragOver ? "drag-active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current.click()}
            >
              <div className="drop-illustration">
                <div className="doc-stack">
                  <div className="doc doc3" />
                  <div className="doc doc2" />
                  <div className="doc doc1">
                    <div className="doc-line" />
                    <div className="doc-line short" />
                    <div className="doc-line" />
                  </div>
                </div>
                <div className="drop-arrow">↓</div>
              </div>
              <p className="drop-title">Drop your PDF here</p>
              <p className="drop-sub">or <span className="browse-link">browse files</span></p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-header-left">
                  <span className="pdf-dot" />
                  <span className="chat-pdf-name">{currentSession.pdf_name}</span>
                </div>
                <button className="export-btn" onClick={exportChat}>↓ Export PDF</button>
              </div>
              <div className="chat-area">
                {currentSession.messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    {msg.role === "ai" && (
                      <div className="avatar ai-avatar">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="3" fill="white"/>
                          <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="3 2"/>
                        </svg>
                      </div>
                    )}
                    <div className="bubble">
                      <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                      {msg.sources?.length > 0 && (
                        <div className="sources">
                          {msg.sources.map((s, j) => <span key={j} className="source-tag">📄 {s}</span>)}
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && <div className="avatar user-avatar">You</div>}
                  </div>
                ))}
                {loading && (
                  <div className="message ai">
                    <div className="avatar ai-avatar">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="3" fill="white"/>
                        <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="3 2"/>
                      </svg>
                    </div>
                    <div className="bubble typing"><span /><span /><span /></div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <div className="input-area">
                <input className="input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAsk()} placeholder="Ask anything about your PDF..." disabled={loading} />
                <button className="send-btn" onClick={handleAsk} disabled={loading || !input.trim()}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9h12M9 3l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </main>
      </div>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files[0])} />
    </div>
  );
}

export default App;