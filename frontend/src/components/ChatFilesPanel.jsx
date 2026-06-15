import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { supabase } from "../services/supabase";
import { dashboardType } from "../dashboardTokens";

const ty = dashboardType;
const API_BASE = "http://localhost:5000";

const ACCEPT = ".pdf,image/*,audio/*,video/*";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mimeToKind(mime) {
  if (mime === "application/pdf") return "pdf";
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("audio/")) return "audio";
  if (mime?.startsWith("video/")) return "video";
  return "file";
}

function kindFromDocType(fileType) {
  if (["pdf", "image", "audio", "video"].includes(fileType)) return fileType;
  return "file";
}

function TypeIcon({ kind, color }) {
  const stroke = color;
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (kind === "pdf") {
    return (
      <svg {...common}>
        <path d="M8 3h6l4 4v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 3v4h4M9 13h6M9 17h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke={stroke} strokeWidth="1.5" />
        <circle cx="9" cy="10" r="1.5" fill={stroke} />
        <path d="M4 17l4.5-4.5 3 3L20 9v10H4v-2z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "audio") {
    return (
      <svg {...common}>
        <path d="M11 5v11.5a3 3 0 1 1-2-2.83M11 5l4-2v6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "video") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M10 10l5 3-5 3V10z" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 4h8l4 4v12H8V4z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon({ color }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" strokeDasharray="20 42" strokeLinecap="round" />
    </svg>
  );
}

export default function ChatFilesPanel({ chatId, t, onUploadDone }) {
  const inputRef = useRef(null);
  const dragDepth = useRef(0);

  const [pendingFiles, setPendingFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState([]);

  const styles = buildStyles(t);

  const deleteDocument = async (docId) => {
    if (deletingId) return;
    try {
      setDeletingId(docId);
      const headers = await getAuthHeaders();
      if (!headers) return;
      await axios.delete(`${API_BASE}/chat/${chatId}/documents/${docId}`, { headers });
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch {
      /* silent */
    } finally {
      setDeletingId(null);
    }
  };

  const fetchDocuments = useCallback(async () => {
    if (!chatId) return;
    try {
      setLoadingList(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await axios.get(`${API_BASE}/chat/${chatId}/documents`, { headers });
      setDocuments(res.data.documents || []);
    } catch (e) {
      console.error("Failed to list documents:", e);
    } finally {
      setLoadingList(false);
    }
  }, [chatId]);

  useEffect(() => {
    setPendingFiles([]);
    setStatus(null);
    setFileProgress([]);
    setDocuments([]);
    fetchDocuments();
  }, [chatId, fetchDocuments]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setPendingFiles((prev) => [...prev, ...incoming]);
    setStatus(null);
    setFileProgress([]);
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragEnter = (e) => { e.preventDefault(); dragDepth.current += 1; setDragging(true); };
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); }
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); addFiles(e.dataTransfer.files); };

  const removePending = (index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  const clearPending = () => { setPendingFiles([]); setStatus(null); setFileProgress([]); };

  const handleUpload = async () => {
    if (!chatId) { setStatus({ type: "error", message: "No active chat." }); return; }
    if (!pendingFiles.length) { setStatus({ type: "error", message: "Select at least one file." }); return; }

    const headers = await getAuthHeaders();
    if (!headers) { setStatus({ type: "error", message: "Not authenticated." }); return; }

    setLoading(true);
    setStatus(null);
    setFileProgress([]);

    const formData = new FormData();
    formData.append("chatId", chatId);
    pendingFiles.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", headers, body: formData });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Upload failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let ev;
          try { ev = JSON.parse(line.slice(6)); } catch { continue; }

          if (ev.event === "saved") {
            setDocuments(ev.documents);
            setFileProgress(ev.documents.map((d) => ({ file: d.fileName, message: "Queued…", done: false, error: false })));

          } else if (ev.event === "step") {
            setFileProgress((prev) => prev.map((fp) => fp.file === ev.file ? { ...fp, message: ev.message } : fp));

          } else if (ev.event === "file_done") {
            setFileProgress((prev) => prev.map((fp) =>
              fp.file === ev.file ? { ...fp, message: `Done — ${ev.chunks} chunk${ev.chunks !== 1 ? "s" : ""} stored`, done: true } : fp
            ));

          } else if (ev.event === "file_error") {
            setFileProgress((prev) => prev.map((fp) =>
              fp.file === ev.file ? { ...fp, message: ev.message, error: true } : fp
            ));

          } else if (ev.event === "done") {
            setPendingFiles([]);
            await fetchDocuments();
            onUploadDone?.();

          } else if (ev.event === "error") {
            setStatus({ type: "error", message: ev.message });
          }
        }
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

  const openFilePicker = () => inputRef.current?.click();

  const allDone = fileProgress.length > 0 && fileProgress.every((fp) => fp.done || fp.error);

  useEffect(() => {
    if (!allDone) return;
    const timer = setTimeout(() => setFileProgress([]), 1800);
    return () => clearTimeout(timer);
  }, [allDone]);

  return (
    <div style={styles.root}>
      <header style={styles.panelHeader}>
        <h3 style={styles.heading}>Files</h3>
        <p style={styles.sub}>Add sources to this chat — PDF, image, audio, or video.</p>
      </header>

      <section style={styles.uploadCard}>
        <div
          style={{ ...styles.dropZone, ...(dragging ? styles.dropZoneActive : {}) }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFilePicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFilePicker(); } }}
        >
          <input ref={inputRef} type="file" multiple accept={ACCEPT} onChange={handleFileChange} style={{ display: "none" }} />
          <div style={styles.dropIconWrap}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 16V8m0 0l-3 3m3-3 3 3" stroke={t.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke={t.muted} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p style={styles.dropTitle}>{dragging ? "Drop to add files" : "Choose files or drag here"}</p>
          <p style={styles.dropHint}>PDF · Images · Audio · Video</p>
        </div>

        {pendingFiles.length > 0 && (
          <div style={styles.queueSection}>
            <div style={styles.queueHeader}>
              <span style={styles.queueTitle}>
                Ready to upload
                <span style={styles.queueCount}>{pendingFiles.length}</span>
              </span>
              <button type="button" style={styles.clearLink} onClick={clearPending}>Clear all</button>
            </div>
            <ul style={styles.queueList}>
              {pendingFiles.map((f, i) => {
                const kind = mimeToKind(f.type);
                return (
                  <li key={`${f.name}-${f.size}-${i}`} style={styles.queueItem}>
                    <div style={{ ...styles.queueIcon, background: t.chipActive }}>
                      <TypeIcon kind={kind} color={t.accent} />
                    </div>
                    <div style={styles.queueMeta}>
                      <span style={styles.queueName} title={f.name}>{f.name}</span>
                      <span style={styles.queueSize}>{formatSize(f.size)}</span>
                    </div>
                    <button type="button" style={styles.removeBtn} title="Remove" onClick={() => removePending(i)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" style={styles.addMoreBtn} onClick={openFilePicker}>+ Add more files</button>
          </div>
        )}

        <button
          type="button"
          style={{ ...styles.uploadBtn, ...(loading || !pendingFiles.length ? styles.uploadBtnDisabled : {}) }}
          onClick={handleUpload}
          disabled={loading || !pendingFiles.length}
        >
          {loading && <span style={styles.btnSpinner} />}
          {loading
            ? "Processing…"
            : pendingFiles.length
              ? `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""}`
              : "Select files to upload"}
        </button>

        {/* Live processing steps */}
        {fileProgress.length > 0 && (
          <div style={styles.progressBlock}>
            {fileProgress.map((fp, i) => (
              <div key={i} style={styles.progressRow}>
                <div style={styles.progressIconWrap}>
                  {fp.done ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : fp.error ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M6 6l12 12M18 6L6 18" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <SpinnerIcon color={t.accent} />
                  )}
                </div>
                <div style={styles.progressInfo}>
                  <span style={styles.progressFile}>{fp.file}</span>
                  <span style={fp.done ? styles.progressMsgDone : fp.error ? styles.progressMsgError : styles.progressMsg}>
                    {fp.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {status && (
          <div style={{ ...styles.statusMsg, ...(status.type === "success" ? styles.statusSuccess : styles.statusError) }}>
            {status.message}
          </div>
        )}
      </section>

      <section style={styles.listSection}>
        <div style={styles.listHeader}>
          <span style={styles.listTitle}>Uploaded</span>
          <span style={styles.listBadge}>{loadingList ? "…" : documents.length}</span>
        </div>

        {loadingList && documents.length === 0 ? (
          <p style={styles.emptyDocs}>Loading files…</p>
        ) : documents.length === 0 ? (
          <div style={styles.emptyBlock}>
            <div style={{ ...styles.emptyIconWrap, background: t.chipActive }}>
              <TypeIcon kind="file" color={t.muted} />
            </div>
            <p style={styles.emptyTitle}>No files yet</p>
            <p style={styles.emptyDocs}>Upload documents above to use them in search.</p>
          </div>
        ) : (
          <ul style={styles.docList}>
            {documents.map((d) => {
              const kind = kindFromDocType(d.fileType);
              return (
                <li key={d._id} style={styles.docRow}>
                  <div style={{ ...styles.docIconWrap, background: t.chipActive }}>
                    <TypeIcon kind={kind} color={t.accent} />
                  </div>
                  <div style={styles.docMeta}>
                    <span style={styles.docName} title={d.fileName}>{d.fileName}</span>
                    <div style={styles.docFooter}>
                      <span style={{ ...styles.typePill, ...styles[`pill_${kind}`] }}>{kind.toUpperCase()}</span>
                      <span style={styles.docDate}>
                        {new Date(d.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDocument(d._id)}
                    disabled={deletingId === d._id}
                    title="Delete file"
                    style={{
                      flexShrink: 0, alignSelf: "center",
                      width: 30, height: 30, borderRadius: 8,
                      border: `1px solid ${t.border}`,
                      background: "transparent",
                      color: deletingId === d._id ? t.muted : "#f87171",
                      cursor: deletingId === d._id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: deletingId === d._id ? 0.5 : 1,
                    }}
                  >
                    {deletingId === d._id ? (
                      <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "block", animation: "spin 0.7s linear infinite" }} />
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M4 7h16M9 7V5.2a1.2 1.2 0 0 1 1.2-1.2h3.6a1.2 1.2 0 0 1 1.2 1.2V7M7 7l.65 11.1c.08 1.2 1.1 2.15 2.3 2.15h4.1c1.2 0 2.22-.95 2.3-2.15L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function buildStyles(t) {
  return {
    root: { width: "100%", minWidth: 0, display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%" },
    panelHeader: { marginBottom: 16, flexShrink: 0 },
    heading: { fontSize: ty.lg, fontWeight: 700, color: t.text, marginBottom: 6, letterSpacing: "-0.02em" },
    sub: { fontSize: ty.sm, color: t.body, margin: 0, lineHeight: 1.55 },

    uploadCard: { flexShrink: 0, padding: 16, borderRadius: 14, border: `1px solid ${t.border}`, background: t.card, display: "flex", flexDirection: "column", gap: 14 },
    dropZone: { border: `2px dashed ${t.borderMuted}`, borderRadius: 12, padding: "22px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: t.inputBg, transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s", textAlign: "center", gap: 6 },
    dropZoneActive: { borderColor: t.accent, background: t.chipActive, boxShadow: `0 0 0 3px ${t.accent}22` },
    dropIconWrap: { width: 48, height: 48, borderRadius: 12, background: t.chipActive, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
    dropTitle: { fontSize: ty.sm, fontWeight: 600, color: t.text, margin: 0 },
    dropHint: { fontSize: ty.xs, color: t.muted, margin: 0, letterSpacing: "0.02em" },

    queueSection: { display: "flex", flexDirection: "column", gap: 10 },
    queueHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
    queueTitle: { fontSize: ty.xs, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.label, display: "flex", alignItems: "center", gap: 8 },
    queueCount: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: t.chipActive, color: t.text, fontSize: ty.xs, letterSpacing: 0, textTransform: "none" },
    clearLink: { background: "none", border: "none", color: t.muted, fontSize: ty.xs, fontWeight: 600, cursor: "pointer", padding: "4px 6px", borderRadius: 6 },
    queueList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" },
    queueItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.inputBg },
    queueIcon: { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    queueMeta: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
    queueName: { fontSize: ty.sm, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    queueSize: { fontSize: ty.xs, color: t.muted, fontWeight: 500 },
    removeBtn: { flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, color: t.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    addMoreBtn: { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px dashed ${t.borderMuted}`, background: "transparent", color: t.body, fontSize: ty.sm, fontWeight: 600, cursor: "pointer" },

    uploadBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${t.accent}, ${t.accentSoft})`, color: "#fff", fontSize: ty.sm, fontWeight: 700, cursor: "pointer", width: "100%", boxShadow: `0 4px 14px ${t.accent}35` },
    uploadBtnDisabled: { opacity: 0.45, cursor: "not-allowed", boxShadow: "none", background: t.borderMuted, color: t.muted },
    btnSpinner: { display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" },

    progressBlock: { display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.inputBg },
    progressRow: { display: "flex", alignItems: "flex-start", gap: 10 },
    progressIconWrap: { width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
    progressInfo: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
    progressFile: { fontSize: ty.xs, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    progressMsg: { fontSize: ty.xs, color: t.body },
    progressMsgDone: { fontSize: ty.xs, color: "#34d399" },
    progressMsgError: { fontSize: ty.xs, color: "#f87171" },
    progressDoneNote: { fontSize: ty.xs, color: t.muted, margin: "4px 0 0", paddingTop: 8, borderTop: `1px solid ${t.border}` },

    statusMsg: { padding: "11px 14px", borderRadius: 10, fontSize: ty.sm, fontWeight: 500, lineHeight: 1.5 },
    statusSuccess: { background: t.successBg, border: `1px solid ${t.successBorder}`, color: t.successText },
    statusError: { background: t.errBg, border: `1px solid ${t.errBorder}`, color: t.errText },

    listSection: { flex: 1, minHeight: 0, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column" },
    listHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexShrink: 0 },
    listTitle: { fontSize: ty.xs, fontWeight: 700, letterSpacing: "0.07em", color: t.label, textTransform: "uppercase" },
    listBadge: { fontSize: ty.xs, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: t.chipActive, color: t.text },
    emptyBlock: { padding: "24px 16px", textAlign: "center", borderRadius: 12, border: `1px dashed ${t.borderMuted}`, background: t.inputBg },
    emptyIconWrap: { width: 44, height: 44, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 },
    emptyTitle: { fontSize: ty.sm, fontWeight: 600, color: t.text, margin: "0 0 6px" },
    emptyDocs: { fontSize: ty.sm, color: t.body, margin: 0, lineHeight: 1.55 },
    docList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, minHeight: 0, paddingRight: 4 },
    docRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: t.card, borderRadius: 12, border: `1px solid ${t.border}` },
    docIconWrap: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    docMeta: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 },
    docName: { fontSize: ty.sm, fontWeight: 600, color: t.text, lineHeight: 1.4, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
    docFooter: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 },
    typePill: { fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 6 },
    pill_pdf: { background: `${t.accent}22`, color: t.accent },
    pill_image: { background: "rgba(52, 211, 153, 0.15)", color: "#34d399" },
    pill_audio: { background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" },
    pill_video: { background: "rgba(96, 165, 250, 0.15)", color: "#60a5fa" },
    pill_file: { background: t.chipActive, color: t.muted },
    docDate: { fontSize: ty.xs, color: t.muted, fontWeight: 500 },
  };
}
