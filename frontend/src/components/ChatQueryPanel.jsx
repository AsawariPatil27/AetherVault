import { useEffect, useRef, useState } from "react";
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

export default function ChatQueryPanel({ chatId, t }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("text");
  const [answer, setAnswer] = useState(null);
  const [diagram, setDiagram] = useState(null);
  const diagramRef = useRef(null);
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const styles = buildStyles(t);

  useEffect(() => {
    setQuery("");
    setAnswer(null);
    setDiagram(null);
    setSources([]);
    setAskErr(null);
    setAsking(false);
    stopSpeaking();
  }, [chatId]);

  // Auto-speak when audio stream finishes (sources signal completion)
  useEffect(() => {
    if (mode === "audio" && answer && sources.length >= 0 && !asking) startSpeaking(answer);
  }, [sources]);

  // Render Mermaid diagram when code arrives
  useEffect(() => {
    if (!diagram || !diagramRef.current) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      suppressErrors: true,
    });
    diagramRef.current.innerHTML = "";
    mermaid.render("aethervault-diagram", diagram).then(({ svg }) => {
      if (diagramRef.current) diagramRef.current.innerHTML = svg;
    }).catch(() => {
      if (diagramRef.current)
        diagramRef.current.innerHTML =
          `<p style="color:#f87171;font-size:13px;margin:0">Couldn't render the mind map — the diagram code was invalid. Try rephrasing your question.</p>`;
    });
  }, [diagram]);

  const startSpeaking = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => { setSpeaking(false); setPaused(false); };
    utterance.onerror = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis.speak(utterance);
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
    if (!chatId || !q) return;
    stopSpeaking();
    setAsking(true);
    setAskErr(null);
    setAnswer(null);
    setDiagram(null);
    setSources([]);
    try {
      const headers = await getAuthHeaders();
      if (!headers) { setAskErr("Not signed in."); return; }

      if (mode === "image") {
        const res = await axios.post(`${API_BASE}/ask`, { query: q, chatId, mode }, { headers });
        if (res.data.diagram) setDiagram(res.data.diagram);
        else setAnswer(res.data.answer);
        setSources(res.data.sources || []);
        return;
      }

      // Text / Audio — stream tokens via SSE
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = JSON.parse(part.slice(6));
          if (payload.error) throw new Error(payload.error);
          if (payload.token) {
            fullAnswer += payload.token;
            setAnswer(fullAnswer);
            setAsking(false);
          }
          if (payload.done) setSources(payload.sources || []);
        }
      }
    } catch (e) {
      setAskErr(e.message || "Request failed");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div style={styles.root}>
      <h3 style={styles.heading}>Ask your documents</h3>
      <p style={styles.sub}>
        Ask a question — the AI searches your uploads and answers based on what it finds.
      </p>

      {/* Mode selector */}
      <div style={styles.modeRow}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            style={{
              ...styles.modeBtn,
              ...(mode === m.id
                ? { background: t.accent, color: "#fff", borderColor: t.accent }
                : { background: "transparent", color: t.muted, borderColor: t.border }),
            }}
            onClick={() => { setMode(m.id); stopSpeaking(); }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          rows={4}
          placeholder={
            mode === "image"
              ? "Ask something to visualize as a mind map from your documents…"
              : "Type a question about your uploaded files…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAsk(); }
          }}
        />
        <div style={styles.inputActions}>
          <button
            type="button"
            style={{
              ...styles.askBtn,
              ...(!query.trim() || asking ? styles.askBtnDisabled : {}),
            }}
            onClick={runAsk}
            disabled={!query.trim() || asking || !chatId}
          >
            {asking ? <span style={styles.miniSpinner} /> : mode === "image" ? "Map it" : "Ask"}
          </button>
        </div>
      </div>

      {askErr && <div style={styles.errBanner}>{askErr}</div>}

      {asking && (
        <div style={styles.thinkingRow}>
          <span style={styles.thinkingDot} />
          <span style={styles.thinkingDot} />
          <span style={styles.thinkingDot} />
          <span style={{ ...styles.thinkingLabel, color: t.dim }}>
            {mode === "image" ? "Generating image…" : "Thinking…"}
          </span>
        </div>
      )}

      {/* Text / Audio answer */}
      {answer && (
        <div style={{ ...styles.answerBlock, borderColor: t.border, background: t.card }}>
          <div style={styles.answerHeader}>
            <span style={{ ...styles.answerLabel, color: t.accent }}>Answer</span>
            {mode === "audio" && (
              <div style={styles.audioControls}>
                <button
                  type="button"
                  style={{ ...styles.audioBtn, borderColor: t.border, color: t.muted }}
                  onClick={() => startSpeaking(answer)}
                  title="Play"
                >
                  {/* Play icon */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M3 2l9 5-9 5V2z" />
                  </svg>
                </button>
                {speaking && (
                  <button
                    type="button"
                    style={{ ...styles.audioBtn, borderColor: t.border, color: t.muted }}
                    onClick={togglePause}
                    title={paused ? "Resume" : "Pause"}
                  >
                    {paused ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M3 2l9 5-9 5V2z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <rect x="2" y="2" width="4" height="10" rx="1" />
                        <rect x="8" y="2" width="4" height="10" rx="1" />
                      </svg>
                    )}
                  </button>
                )}
                {speaking && (
                  <button
                    type="button"
                    style={{ ...styles.audioBtn, borderColor: t.border, color: t.muted }}
                    onClick={stopSpeaking}
                    title="Stop"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <rect x="2" y="2" width="10" height="10" rx="2" />
                    </svg>
                  </button>
                )}
                {speaking && (
                  <span style={{ ...styles.speakingBadge, color: t.accent }}>
                    {paused ? "Paused" : "Speaking…"}
                  </span>
                )}
              </div>
            )}
          </div>
          <p style={{ ...styles.answerText, color: t.text }}>{answer}</p>

          {sources.length > 0 && (
            <div style={styles.sourcesSection}>
              <div style={{ ...styles.sourcesLabel, color: t.label }}>Sources</div>
              <div style={styles.sourcesList}>
                {getCitedSources(answer, sources).map((s) => (
                  <div key={s.citationNum} style={{ ...styles.sourceCard, borderColor: t.border, background: t.card }}>
                    <div style={styles.sourceMeta}>
                      <span style={{ ...styles.sourceNum, color: "#fff", background: t.accent }}>
                        {s.citationNum}
                      </span>
                      <span style={{ ...styles.badge, color: t.accent, background: t.chipActive }}>
                        {s.sourceType || "chunk"}
                      </span>
                      {s.fileName && (
                        <span style={{ ...styles.fileTag, color: t.muted }}>{s.fileName}</span>
                      )}
                    </div>
                    <p style={{ ...styles.sourceText, color: t.body }}>
                      {s.text.length > 200 ? s.text.slice(0, 200) + "…" : s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diagram answer */}
      {diagram && (
        <div style={{ ...styles.answerBlock, borderColor: t.border, background: t.card }}>
          <div style={styles.answerHeader}>
            <span style={{ ...styles.answerLabel, color: t.accent }}>Mind Map</span>
          </div>
          <div ref={diagramRef} style={styles.diagramContainer} />
          {sources.length > 0 && (
            <div style={styles.sourcesSection}>
              <div style={{ ...styles.sourcesLabel, color: t.label }}>Based on</div>
              <div style={styles.sourcesList}>
                {sources.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ ...styles.sourceCard, borderColor: t.border, background: t.card }}>
                    <div style={styles.sourceMeta}>
                      <span style={{ ...styles.sourceNum, color: "#fff", background: t.accent }}>{i + 1}</span>
                      {s.fileName && <span style={{ ...styles.fileTag, color: t.muted }}>{s.fileName}</span>}
                    </div>
                    <p style={{ ...styles.sourceText, color: t.body }}>
                      {s.text.length > 150 ? s.text.slice(0, 150) + "…" : s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildStyles(t) {
  return {
    root: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
    heading: {
      fontSize: ty.lg, fontWeight: 700, color: t.text,
      marginBottom: 6, letterSpacing: "-0.02em", lineHeight: 1.25,
    },
    sub: {
      fontSize: ty.sm, color: t.body,
      marginBottom: 16, lineHeight: 1.55, maxWidth: 520,
    },
    modeRow: {
      display: "flex", gap: 8, marginBottom: 16,
    },
    modeBtn: {
      padding: "8px 18px", borderRadius: 8, border: "1px solid",
      fontSize: ty.sm, fontWeight: 600, cursor: "pointer",
      transition: "all 0.15s",
    },
    inputRow: { display: "flex", flexDirection: "column", gap: 12 },
    textarea: {
      width: "100%", resize: "vertical", minHeight: 96,
      padding: "14px 16px", borderRadius: 12,
      border: `1px solid ${t.border}`, background: t.inputBg,
      color: t.text, fontSize: ty.base, fontFamily: "inherit",
      outline: "none", lineHeight: 1.6,
    },
    inputActions: { display: "flex", alignItems: "center", gap: 10 },
    askBtn: {
      padding: "11px 24px", borderRadius: 10, border: "none",
      background: `linear-gradient(135deg, ${t.accent}, ${t.accentSoft})`,
      color: "#fff", fontSize: ty.sm, fontWeight: 700, cursor: "pointer",
      minWidth: 110, display: "flex", alignItems: "center",
      justifyContent: "center", boxShadow: `0 4px 16px ${t.accent}36`,
    },
    askBtnDisabled: { opacity: 0.45, cursor: "not-allowed", boxShadow: "none" },
    miniSpinner: {
      width: 16, height: 16, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.35)",
      borderTopColor: "#fff", animation: "spin 0.7s linear infinite",
    },
    errBanner: {
      marginTop: 12, padding: "12px 14px", borderRadius: 10,
      fontSize: ty.sm, lineHeight: 1.5,
      background: t.errBg, border: `1px solid ${t.errBorder}`, color: t.errText,
    },
    thinkingRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 24 },
    thinkingDot: {
      width: 7, height: 7, borderRadius: "50%",
      background: t.accent, animation: "pulse 1.2s ease-in-out infinite",
    },
    thinkingLabel: { fontSize: ty.sm, marginLeft: 4 },
    answerBlock: {
      marginTop: 24, padding: "20px 22px", borderRadius: 14, border: "1px solid",
    },
    answerHeader: {
      display: "flex", alignItems: "center",
      justifyContent: "space-between", marginBottom: 12,
    },
    answerLabel: {
      fontSize: ty.xs, fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase",
    },
    audioControls: { display: "flex", alignItems: "center", gap: 6 },
    audioBtn: {
      width: 30, height: 30, borderRadius: 8, border: "1px solid",
      background: "transparent", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    speakingBadge: { fontSize: ty.xs, fontWeight: 600 },
    answerText: {
      fontSize: ty.base, lineHeight: 1.75, margin: 0,
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    },
    diagramContainer: {
      width: "100%", overflowX: "auto",
      marginBottom: 12, textAlign: "center",
    },
    sourcesSection: { marginTop: 18 },
    sourcesLabel: {
      fontSize: ty.xs, fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10,
    },
    sourcesList: { display: "flex", flexDirection: "column", gap: 10 },
    sourceCard: { padding: "14px 16px", borderRadius: 10, border: "1px solid" },
    sourceMeta: {
      display: "flex", flexWrap: "wrap", gap: 8,
      alignItems: "center", marginBottom: 8,
    },
    sourceNum: {
      fontSize: ty.xs, fontWeight: 700,
      width: 22, height: 22, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    badge: {
      fontSize: ty.xs, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 6,
    },
    fileTag: {
      fontSize: ty.sm, fontWeight: 600,
      overflow: "hidden", textOverflow: "ellipsis",
      whiteSpace: "nowrap", maxWidth: "100%",
    },
    sourceText: {
      fontSize: ty.sm, margin: 0, lineHeight: 1.65,
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    },
  };
}
