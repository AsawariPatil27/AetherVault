import { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "../services/supabase";
import { dashboardType } from "../dashboardTokens";

const API_BASE = "http://localhost:5000";
const ty = dashboardType;

function getCitedSources(answerText, sources) {
  const matches = [...(answerText || "").matchAll(/\[(\d+)\]/g)];
  const cited = new Set(matches.map((m) => parseInt(m[1]) - 1));
  const valid = [...cited].filter((i) => i >= 0 && i < sources.length).sort((a, b) => a - b);
  return valid.length > 0
    ? valid.map((i) => ({ ...sources[i], citationNum: i + 1 }))
    : sources.map((s, i) => ({ ...s, citationNum: i + 1 }));
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export default function ChatQueryPanel({ chatId, t }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState(null);
  const styles = buildStyles(t);

  useEffect(() => {
    setQuery("");
    setAnswer(null);
    setSources([]);
    setAskErr(null);
    setAsking(false);
  }, [chatId]);

  const runAsk = async () => {
    const q = query.trim();
    if (!chatId || !q) return;
    setAsking(true);
    setAskErr(null);
    setAnswer(null);
    setSources([]);
    try {
      const headers = await getAuthHeaders();
      if (!headers) { setAskErr("Not signed in."); return; }
      const res = await axios.post(`${API_BASE}/ask`, { query: q, chatId }, { headers });
      setAnswer(res.data.answer);
      setSources(res.data.sources || []);
    } catch (e) {
      setAskErr(e.response?.data?.error || e.message || "Request failed");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div style={styles.root}>
      <h3 style={styles.heading}>Ask your documents</h3>
      <p style={styles.sub}>
        Ask a question — the AI will search your uploads and answer based on what it finds.
      </p>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          rows={4}
          placeholder="Type a question about your uploaded files…"
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
            {asking ? <span style={styles.miniSpinner} /> : "Ask"}
          </button>
        </div>
      </div>

      {askErr && <div style={styles.errBanner}>{askErr}</div>}

      {asking && (
        <div style={styles.thinkingRow}>
          <span style={styles.thinkingDot} />
          <span style={styles.thinkingDot} />
          <span style={styles.thinkingDot} />
          <span style={{ ...styles.thinkingLabel, color: t.dim }}>Thinking…</span>
        </div>
      )}

      {answer && (
        <div style={styles.answerBlock}>
          <div style={styles.answerHeader}>
            <span style={{ ...styles.answerLabel, color: t.accent }}>Answer</span>
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
      marginBottom: 20, lineHeight: 1.55, maxWidth: 520,
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
    thinkingRow: {
      display: "flex", alignItems: "center", gap: 6, marginTop: 24,
    },
    thinkingDot: {
      width: 7, height: 7, borderRadius: "50%",
      background: t.accent, animation: "pulse 1.2s ease-in-out infinite",
    },
    thinkingLabel: { fontSize: ty.sm, marginLeft: 4 },
    answerBlock: {
      marginTop: 24, padding: "20px 22px", borderRadius: 14,
      border: `1px solid ${t.border}`, background: t.card,
    },
    answerHeader: { marginBottom: 12 },
    answerLabel: {
      fontSize: ty.xs, fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase",
    },
    answerText: {
      fontSize: ty.base, lineHeight: 1.75, margin: 0,
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    },
    sourcesSection: { marginTop: 18 },
    sourcesLabel: {
      fontSize: ty.xs, fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10,
    },
    sourcesList: { display: "flex", flexDirection: "column", gap: 10 },
    sourceCard: {
      padding: "14px 16px", borderRadius: 10, border: "1px solid",
    },
    sourceMeta: {
      display: "flex", flexWrap: "wrap", gap: 8,
      alignItems: "center", marginBottom: 8,
    },
    sourceNum: {
      fontSize: ty.xs, fontWeight: 700,
      width: 22, height: 22, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
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
