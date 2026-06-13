import { useEffect, useState } from "react";
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

/**
 * Center column: query input + hybrid search results.
 */
export default function ChatQueryPanel({ chatId, t }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);
  const styles = buildStyles(t);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setSearchErr(null);
    setSearching(false);
  }, [chatId]);

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
      <p style={styles.sub}>
        Search this chat using semantic similarity and keyword matching.
      </p>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          rows={4}
          placeholder="Type a question about your uploaded files…"
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
          <p style={styles.hint}>
            Run a search to see matching passages from your uploads.
          </p>
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
      fontSize: ty.lg,
      fontWeight: 700,
      color: t.text,
      marginBottom: 6,
      letterSpacing: "-0.02em",
      lineHeight: 1.25,
    },
    sub: {
      fontSize: ty.sm,
      color: t.body,
      marginBottom: 20,
      lineHeight: 1.55,
      maxWidth: 520,
    },
    inputRow: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    textarea: {
      width: "100%",
      resize: "vertical",
      minHeight: 96,
      padding: "14px 16px",
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.inputBg,
      color: t.text,
      fontSize: ty.base,
      fontFamily: "inherit",
      outline: "none",
      lineHeight: 1.6,
    },
    inputActions: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    searchBtn: {
      padding: "11px 24px",
      borderRadius: 10,
      border: "none",
      background: `linear-gradient(135deg, ${t.accent}, ${t.accentSoft})`,
      color: "#fff",
      fontSize: ty.sm,
      fontWeight: 700,
      cursor: "pointer",
      minWidth: 110,
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
      marginTop: 12,
      padding: "12px 14px",
      borderRadius: 10,
      fontSize: ty.sm,
      lineHeight: 1.5,
      background: t.errBg,
      border: `1px solid ${t.errBorder}`,
      color: t.errText,
    },
    resultsHeader: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 28,
      marginBottom: 12,
    },
    resultsTitle: {
      fontSize: ty.xs,
      fontWeight: 700,
      letterSpacing: "0.07em",
      color: t.label,
      textTransform: "uppercase",
    },
    countBadge: {
      fontSize: ty.xs,
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: 999,
      background: t.chipActive,
      color: t.text,
    },
    results: {
      flex: 1,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingRight: 6,
      minHeight: 140,
    },
    hint: {
      fontSize: ty.sm,
      color: t.body,
      margin: 0,
      lineHeight: 1.6,
    },
    resultCard: {
      padding: "16px 18px",
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.card,
    },
    resultMeta: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "center",
      marginBottom: 10,
    },
    badge: {
      fontSize: ty.xs,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: t.accent,
      padding: "2px 8px",
      borderRadius: 6,
      background: t.chipActive,
    },
    fileTag: {
      fontSize: ty.sm,
      fontWeight: 600,
      color: t.muted,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: "100%",
    },
    resultText: {
      fontSize: ty.base,
      color: t.body,
      margin: 0,
      lineHeight: 1.7,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
  };
}
