import { useState } from "react";
import axios from "axios";
import { supabase } from "../services/supabase";

const API_BASE = "http://localhost:5000";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

/**
 * Center column: query input + hybrid search results.
 */
export default function ChatQueryPanel({ chatId, t }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);
  const styles = buildStyles(t);

  const runSearch = async () => {
    const q = query.trim();
    if (!chatId || !q) return;
    setSearching(true);
    setSearchErr(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setSearchErr("Not signed in.");
        return;
      }
      const res = await axios.post(
        `${API_BASE}/search`,
        { query: q, chatId },
        { headers }
      );
      setResults(res.data.results || []);
    } catch (e) {
      setSearchErr(e.response?.data?.error || e.message || "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };


  return (
    <div style={styles.root}>
      <h3 style={styles.heading}>Ask your documents</h3>
      <p style={styles.sub}>Search uses embeddings and text for this chat only.</p>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="Type a question…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              runSearch();
            }
          }}
        />
        <div style={styles.inputActions}>
          <button
            type="button"
            style={{
              ...styles.searchBtn,
              ...(!query.trim() || searching ? styles.searchBtnDisabled : {}),
            }}
            onClick={runSearch}
            disabled={!query.trim() || searching || !chatId}
          >
            {searching ? <span style={styles.miniSpinner} /> : "Search"}
          </button>
        </div>
      </div>
      {searchErr && <div style={styles.errBanner}>{searchErr}</div>}

      <div style={styles.resultsHeader}>
        <span style={styles.resultsTitle}>Results</span>
        {!searching && results.length > 0 && (
          <span style={styles.countBadge}>{results.length}</span>
        )}
      </div>

      <div style={styles.results}>
        {!searching && results.length === 0 && (
          <p style={styles.hint}>Run a search to see matching chunks from your uploads.</p>
        )}
        {results.map((r) => (
          <div key={r._id} style={styles.resultCard}>
            <div style={styles.resultMeta}>
              <span style={styles.badge}>{r.metadata?.sourceType || "chunk"}</span>
              {r.metadata?.fileName && (
                <span style={styles.fileTag}>{r.metadata.fileName}</span>
              )}
            </div>
            <p style={styles.resultText}>{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildStyles(t) {
  return {
    root: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
    },
    heading: {
      fontSize: 17,
      fontWeight: 700,
      color: t.text,
      marginBottom: 4,
    },
    sub: {
      fontSize: 12,
      color: t.dim,
      marginBottom: 16,
      lineHeight: 1.55,
    },
    inputRow: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    textarea: {
      width: "100%",
      resize: "vertical",
      minHeight: 72,
      padding: "12px 14px",
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.inputBg,
      color: t.text,
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      lineHeight: 1.5,
    },
    inputActions: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    searchBtn: {
      padding: "10px 22px",
      borderRadius: 10,
      border: "none",
      background: `linear-gradient(135deg, ${t.accent}, ${t.accentSoft})`,
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      minWidth: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 4px 16px ${t.accent}36`,
    },
    searchBtnDisabled: { opacity: 0.45, cursor: "not-allowed", boxShadow: "none" },
    miniSpinner: {
      width: 16,
      height: 16,
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.35)",
      borderTopColor: "#fff",
      animation: "spin 0.7s linear infinite",
    },
    errBanner: {
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 8,
      fontSize: 12,
      background: t.errBg,
      border: `1px solid ${t.errBorder}`,
      color: t.errText,
    },
    resultsHeader: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 22,
      marginBottom: 10,
    },
    resultsTitle: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.06em",
      color: t.dim,
      textTransform: "uppercase",
    },
    countBadge: {
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 999,
      background: t.chipActive,
      color: t.muted,
    },
    results: {
      flex: 1,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      paddingRight: 4,
      minHeight: 120,
    },
    hint: {
      fontSize: 12,
      color: t.dim,
      margin: 0,
      lineHeight: 1.6,
    },
    resultCard: {
      padding: "12px 14px",
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.card,
    },
    resultMeta: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
      marginBottom: 8,
    },
    badge: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: t.accent,
    },
    fileTag: {
      fontSize: 11,
      color: t.dim,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: "100%",
    },
    resultText: {
      fontSize: 13,
      color: t.muted,
      margin: 0,
      lineHeight: 1.65,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
  };
}
