import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import axios from "axios";
import { supabase } from "../services/supabase";
import { dashboardType } from "../dashboardTokens";

const API_BASE = "http://localhost:5000";
const ty = dashboardType;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

function getCitedSources(answerText, sources) {
  const matches = [...(answerText || "").matchAll(/\[(\d+)\]/g)];
  const cited = new Set(matches.map((m) => parseInt(m[1]) - 1));
  const valid = [...cited].filter((i) => i >= 0 && i < sources.length).sort((a, b) => a - b);
  return valid.length > 0
    ? valid.map((i) => ({ ...sources[i], citationNum: i + 1 }))
    : sources.map((s, i) => ({ ...s, citationNum: i + 1 }));
}


const MODES = [
  { id: "text", label: "Text" },
  { id: "audio", label: "Audio" },
  { id: "image", label: "Mind Map" },
];


// Mermaid diagram sub-component
const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  suppressErrors: true,
  themeVariables: {
    primaryColor: "#7c3aed",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#6d28d9",
    lineColor: "#a78bfa",
    background: "#13111f",
    mainBkg: "#1e1a3a",
    nodeBorder: "#6d28d9",
    clusterBkg: "#1e1a3a",
    titleColor: "#e2e8f0",
    edgeLabelBackground: "#1e1a3a",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontSize: "14px",
    nodeTextColor: "#e2e8f0",
  },
};

function DiagramBlock({ code }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!code || !svgRef.current) return;

    const ERROR_HTML = `<p style="color:#f87171;font-size:13px;margin:0;padding:8px 0">Could not render diagram. Try rephrasing your question.</p>`;

    mermaid.initialize(MERMAID_CONFIG);
    svgRef.current.innerHTML = "";

    mermaid.parse(code)
      .then(() => mermaid.render("av-diagram-" + Date.now(), code))
      .then(({ svg }) => {
        if (!svgRef.current) return;
        svgRef.current.innerHTML = svg;

        const svgEl = svgRef.current.querySelector("svg");
        if (!svgEl) return;

        // Ensure viewBox exists — required for SVG native zoom-to-fit
        if (!svgEl.getAttribute("viewBox")) {
          const w = parseFloat(svgEl.getAttribute("width")) || 800;
          const h = parseFloat(svgEl.getAttribute("height")) || 400;
          svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
        }

        // Set width/height to 100% so the SVG fills its container
        // and scales all nodes to always be fully visible (zoom-to-fit)
        svgEl.setAttribute("width", "100%");
        svgEl.setAttribute("height", "100%");
        svgEl.style.maxWidth = "none";
        svgEl.style.display = "block";
      })
      .catch(() => {
        if (svgRef.current) svgRef.current.innerHTML = ERROR_HTML;
      });
  }, [code]);

  return (
    <div style={{
      width: "100%",
      height: 460,
      borderRadius: 14,
      border: "1px solid rgba(124,58,237,0.35)",
      background: "#13111f",
      padding: 16,
      boxSizing: "border-box",
      overflow: "hidden",
    }}>
      <div ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// Sources accordion sub-component
function SourcesToggle({ answer, sources, t }) {
  const [open, setOpen] = useState(false);
  const cited = getCitedSources(answer, sources);
  if (!cited.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "transparent", border: `1px solid ${t.border}`,
          borderRadius: 8, padding: "5px 12px", cursor: "pointer",
          fontSize: ty.xs, color: t.muted, display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span style={{ color: t.accent }}>◎</span>
        {cited.length} source{cited.length !== 1 ? "s" : ""}
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {cited.map((s) => (
            <div key={s.citationNum} style={{
              padding: "10px 14px", borderRadius: 10,
              border: `1px solid ${t.border}`, background: t.inputBg,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: ty.xs, fontWeight: 700, width: 20, height: 20,
                  borderRadius: "50%", background: t.accent, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{s.citationNum}</span>
                {s.fileName && <span style={{ fontSize: ty.xs, color: t.muted, fontWeight: 600 }}>{s.fileName}</span>}
                {s.sourceType && <span style={{
                  fontSize: ty.xs, color: t.accent, background: t.chipActive,
                  padding: "1px 7px", borderRadius: 5, fontWeight: 700, textTransform: "uppercase",
                }}>{s.sourceType}</span>}
              </div>
              {s.sourceType === "image" && s.mediaUrl ? (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={s.mediaUrl}
                    alt={s.fileName || "Source Image"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 250,
                      borderRadius: 8,
                      objectFit: "contain",
                      border: `1px solid ${t.border}`,
                    }}
                  />
                </div>
              ) : s.text ? (
                <p style={{ fontSize: ty.sm, color: t.body, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {s.text.length > 220 ? s.text.slice(0, 220) + "…" : s.text}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatQueryPanel({ chatId, t, onTitleUpdate }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("text");
  const [asking, setAsking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef(null);
  const styles = buildStyles(t);

  // Reset and load history on chat change
  useEffect(() => {
    setMessages([]);
    setQuery("");
    setAsking(false);
    stopSpeaking();
    if (chatId) loadMessages();
  }, [chatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await axios.get(`${API_BASE}/chat/${chatId}/messages`, { headers });
      const loaded = (res.data.messages || []).map((m) => {
        const msgMode = m.metadata?.mode || "text";
        const isDiagram = msgMode === "image" && m.role === "assistant";
        return {
          role: m.role,
          content: isDiagram ? "" : m.content,
          diagram: isDiagram ? m.content : null,
          sources: (m.metadata?.sources || []).map((s) => ({
            fileName: s.fileName,
            sourceType: s.fileType,
            text: s.text || "",
            fileKey: s.fileKey,
          })),
          mode: msgMode,
          streaming: false,
        };
      });
      setMessages(loaded);
    } catch { /* silent — empty chat is fine */ }
  };



  const detectLang = (text) => {
    if (/[ऀ-ॿ]/.test(text)) return "mr-IN";
    if (/[؀-ۿ]/.test(text)) return "ar-SA";
    if (/[一-鿿]/.test(text)) return "zh-CN";
    if (/[぀-ヿ]/.test(text)) return "ja-JP";
    if (/[가-힯]/.test(text)) return "ko-KR";
    return "en-US";
  };

  const startSpeaking = (text) => {
    window.speechSynthesis.cancel();
    const lang = detectLang(text);

    const doSpeak = (voices) => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = 1;
      // Try exact match first (e.g. mr-IN), then language prefix (mr)
      const langPrefix = lang.split("-")[0];
      const voice =
        voices.find((v) => v.lang === lang) ||
        voices.find((v) => v.lang.startsWith(langPrefix));
      if (voice) utt.voice = voice;
      utt.onstart = () => setSpeaking(true);
      utt.onend = () => { setSpeaking(false); setPaused(false); };
      utt.onerror = () => { setSpeaking(false); setPaused(false); };
      window.speechSynthesis.speak(utt);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak(voices);
    } else {
      // Voices not loaded yet — wait for the event then speak
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak(window.speechSynthesis.getVoices());
      };
    }
  };

  const togglePause = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else { window.speechSynthesis.pause(); setPaused(true); }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  const runAsk = async () => {
    const q = query.trim();
    if (!chatId || !q || asking) return;

    stopSpeaking();
    setQuery("");
    setAsking(true);

    // Add user message immediately
    const userMsg = { role: "user", content: q, mode };
    const assistantMsg = { role: "assistant", content: "", sources: [], diagram: null, mode, streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const updateLast = (patch) =>
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
        return copy;
      });

    try {
      const headers = await getAuthHeaders();
      if (!headers) { updateLast({ content: "Not signed in.", streaming: false }); setAsking(false); return; }

      if (mode === "image") {
        const res = await axios.post(`${API_BASE}/ask`, { query: q, chatId, mode }, { headers });
        if (res.data.diagram) {
          updateLast({ diagram: res.data.diagram, sources: res.data.sources || [], streaming: false });
        } else {
          updateLast({ content: res.data.answer || "Could not generate diagram.", sources: [], streaming: false });
        }
        if (res.data.title) onTitleUpdate?.(chatId, res.data.title);
        setAsking(false);
        return;
      }

      const response = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, chatId, mode }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let fullAnswer = "";
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let payload;
          try { payload = JSON.parse(part.slice(6)); } catch { continue; }
          if (payload.error) throw new Error(payload.error);
          if (payload.token) {
            if (firstToken) { setAsking(false); firstToken = false; }
            fullAnswer += payload.token;
            updateLast({ content: fullAnswer });
          }
          if (payload.done) {
            const sources = payload.sources || [];
            updateLast({ sources, streaming: false });
            if (mode === "audio") startSpeaking(fullAnswer);
            if (payload.title) onTitleUpdate?.(chatId, payload.title);
          }
        }
      }
    } catch (e) {
      updateLast({ content: e.message || "Request failed.", streaming: false });
    } finally {
      setAsking(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Messages area */}
      <div style={styles.messagesArea}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <p style={{ color: t.muted, fontSize: ty.sm, margin: 0 }}>
              Ask a question about your uploaded documents
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={msg.role === "user" ? styles.userRow : styles.assistantRow}>
            {msg.role === "assistant" && (
              <div style={{ ...styles.avatar, background: t.accent }}>A</div>
            )}

            <div style={{
              ...styles.bubble,
              ...(msg.role === "user"
                ? { background: t.accent, color: "#fff", borderRadius: "18px 18px 4px 18px" }
                : { background: t.card, border: `1px solid ${t.border}`, borderRadius: "4px 18px 18px 18px", color: t.text }),
              maxWidth: msg.role === "user" ? "70%" : "85%",
            }}>
              {msg.role === "user" ? (
                <p style={{ margin: 0, fontSize: ty.base, lineHeight: 1.6 }}>{msg.content}</p>
              ) : msg.diagram ? (
                <>
                  <DiagramBlock code={msg.diagram} />
                  {msg.sources?.length > 0 && <SourcesToggle answer="" sources={msg.sources} t={t} />}
                </>
              ) : (
                <>
                  {msg.streaming && !msg.content ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0, 1, 2].map((i) => (
                          <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: t.accent, display: "inline-block", animation: "pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                        ))}
                      </div>
                      <span style={{ fontSize: ty.sm, color: t.muted, fontStyle: "italic" }}>Thinking…</span>
                    </div>
                  ) : (
                    <div style={styles.markdownBody} className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || (msg.streaming ? "" : "No content.")}
                      </ReactMarkdown>
                    </div>
                  )}
                  {msg.streaming && msg.content && (
                    <span style={{ display: "inline-block", width: 8, height: 14, background: t.accent, borderRadius: 2, marginLeft: 2, animation: "blink 0.8s step-end infinite" }} />
                  )}
                  {!msg.streaming && msg.sources?.length > 0 && (
                    <SourcesToggle answer={msg.content} sources={msg.sources} t={t} />
                  )}
                  {!msg.streaming && msg.mode === "audio" && msg.content && (
                    <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
                      <button onClick={() => startSpeaking(msg.content)} style={styles.audioBtn(t)} title="Play">▶</button>
                      {speaking && <button onClick={togglePause} style={styles.audioBtn(t)} title={paused ? "Resume" : "Pause"}>{paused ? "▶" : "⏸"}</button>}
                      {speaking && <button onClick={stopSpeaking} style={styles.audioBtn(t)} title="Stop">⏹</button>}
                      {speaking && <span style={{ fontSize: ty.xs, color: t.accent }}>{paused ? "Paused" : "Speaking…"}</span>}
                    </div>
                  )}
                </>
              )}
            </div>

            {msg.role === "user" && (
              <div style={{ ...styles.avatar, background: t.chipActive, color: t.accent }}>U</div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <div style={styles.modeRow}>
          {MODES.map((m) => (
            <button key={m.id} onClick={() => { setMode(m.id); stopSpeaking(); }} style={{
              ...styles.modeBtn,
              ...(mode === m.id
                ? { background: t.accent, color: "#fff", borderColor: t.accent }
                : { background: "transparent", color: t.muted, borderColor: t.border }),
            }}>{m.label}</button>
          ))}
        </div>
        <div style={styles.inputRow}>
          <textarea
            style={{ ...styles.textarea, borderColor: t.border, background: t.inputBg, color: t.text }}
            rows={3}
            placeholder={mode === "image" ? "Ask something to visualize as a mind map…" : "Ask a question about your documents…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAsk(); } }}
          />
          <button
            onClick={runAsk}
            disabled={!query.trim() || asking || !chatId}
            style={{
              ...styles.sendBtn,
              background: !query.trim() || asking || !chatId ? t.border : `linear-gradient(135deg, ${t.accent}, ${t.accentSoft})`,
              cursor: !query.trim() || asking || !chatId ? "not-allowed" : "pointer",
            }}
          >
            {asking ? <span style={styles.spinner} /> : "↑"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function buildStyles(t) {
  return {
    root: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
    messagesArea: {
      flex: 1, overflowY: "auto", padding: "24px 16px",
      display: "flex", flexDirection: "column", gap: 20,
    },
    emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginTop: 60 },
    userRow: { display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 8 },
    assistantRow: { display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 8 },
    avatar: {
      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: "#fff",
    },
    bubble: { padding: "12px 16px", wordBreak: "break-word", lineHeight: 1.65 },
    markdownBody: {
      fontSize: ty.base, lineHeight: 1.75,
    },
    inputArea: {
      borderTop: `1px solid ${t.border}`, padding: "12px 16px",
      flexShrink: 0, display: "flex", flexDirection: "column", gap: 10,
    },
    modeRow: { display: "flex", gap: 6 },
    modeBtn: {
      padding: "6px 14px", borderRadius: 20, border: "1px solid",
      fontSize: ty.xs, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
    },
    inputRow: { display: "flex", gap: 10, alignItems: "flex-end" },
    textarea: {
      flex: 1, resize: "none", padding: "12px 14px", borderRadius: 12,
      border: "1px solid", fontSize: ty.base, fontFamily: "inherit",
      outline: "none", lineHeight: 1.6, minHeight: 52,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: "50%", border: "none",
      color: "#fff", fontSize: 18, display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    spinner: {
      width: 16, height: 16, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.35)",
      borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "block",
    },
    audioBtn: (t) => ({
      width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.border}`,
      background: "transparent", cursor: "pointer", fontSize: 12,
      display: "flex", alignItems: "center", justifyContent: "center", color: t.muted,
    }),
  };
}
