import { useCallback, useEffect, useState } from "react";
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
 * Right column: upload files for the chat + list uploaded documents from the backend.
 */
export default function ChatFilesPanel({ chatId, t, onUploadDone }) {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [dragging, setDragging] = useState(false);

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
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setPendingFiles(selected);
    setStatus(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setPendingFiles(dropped);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!chatId) {
      setStatus({ type: "error", message: "No active chat." });
      return;
    }
    if (!pendingFiles.length) {
      setStatus({ type: "error", message: "Select at least one file." });
      return;
    }
    try {
      setLoading(true);
      setStatus(null);
      const headers = await getAuthHeaders();
      if (!headers) {
        setStatus({ type: "error", message: "Not authenticated." });
        return;
      }
      const formData = new FormData();
      formData.append("chatId", chatId);
      pendingFiles.forEach((f) => formData.append("files", f));
      await axios.post(`${API_BASE}/upload`, formData, { headers });
      setStatus({
        type: "success",
        message: `${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""} uploaded.`,
      });
      setPendingFiles([]);
      await fetchDocuments();
      onUploadDone?.();
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Upload failed";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const removePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const styles = buildStyles(t);

  return (
    <div style={styles.root}>
      <h3 style={styles.heading}>Files</h3>
      <p style={styles.sub}>Upload PDFs, images, audio, or video for this chat.</p>

      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneActive : {}),
          ...(pendingFiles.length > 0 ? styles.dropZoneFilled : {}),
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("chat-file-input")?.click()}
      >
        <input
          id="chat-file-input"
          type="file"
          multiple
          accept=".pdf,image/*,audio/*,video/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {pendingFiles.length === 0 ? (
          <>
            <div style={styles.uploadIcon}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 22V10M10 16l6-6 6 6"
                  stroke={t.accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="4"
                  y="4"
                  width="24"
                  height="24"
                  rx="8"
                  stroke={t.borderMuted}
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <p style={styles.dropText}>{dragging ? "Drop files here" : "Drag & drop or click"}</p>
            <p style={styles.dropHint}>PDF, image, audio, video</p>
          </>
        ) : (
          <div style={styles.fileList} onClick={(e) => e.stopPropagation()}>
            {pendingFiles.map((f, i) => (
              <div key={i} style={styles.fileRow}>
                <span style={styles.fileIcon}>{fileIcon(f.type)}</span>
                <span style={styles.fileName}>{f.name}</span>
                <span style={styles.fileSize}>{formatSize(f.size)}</span>
                <button type="button" style={styles.removeBtn} onClick={() => removePending(i)}>
                  ✕
                </button>
              </div>
            ))}
            <p style={styles.addMoreHint}>Click area to add more</p>
          </div>
        )}
      </div>

      <button
        type="button"
        style={{
          ...styles.uploadBtn,
          ...(loading || !pendingFiles.length ? styles.uploadBtnDisabled : {}),
        }}
        onClick={handleUpload}
        disabled={loading || !pendingFiles.length}
      >
        {loading ? <span style={styles.btnSpinner} /> : null}
        {loading ? "Uploading…" : pendingFiles.length ? `Upload (${pendingFiles.length})` : "Upload"}
      </button>

      {status && (
        <div
          style={{
            ...styles.statusMsg,
            ...(status.type === "success" ? styles.statusSuccess : styles.statusError),
          }}
        >
          {status.type === "success" ? "✓" : "✕"} {status.message}
        </div>
      )}

      <div style={styles.listSection}>
        <div style={styles.listHeader}>
          <span style={styles.listTitle}>In this chat</span>
          {loadingList && <span style={styles.listHint}>Refreshing…</span>}
        </div>
        {documents.length === 0 && !loadingList ? (
          <p style={styles.emptyDocs}>No files uploaded yet.</p>
        ) : (
          <ul style={styles.docList}>
            {documents.map((d) => (
              <li key={d._id} style={styles.docRow}>
                <span style={styles.docIcon}>{fileTypeLabel(d.fileType)}</span>
                <div style={styles.docMeta}>
                  <span style={styles.docName}>{d.fileName}</span>
                  <span style={styles.docDate}>
                    {new Date(d.createdAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function fileIcon(mime) {
  if (mime === "application/pdf") return "📄";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.startsWith("video/")) return "🎬";
  return "📁";
}

function fileTypeLabel(t) {
  if (t === "pdf") return "📄";
  if (t === "image") return "🖼️";
  if (t === "audio") return "🎵";
  if (t === "video") return "🎬";
  return "📁";
}

function buildStyles(t) {
  return {
    root: { width: "100%", minWidth: 0 },
    heading: {
      fontSize: 15,
      fontWeight: 700,
      color: t.text,
      marginBottom: 4,
    },
    sub: {
      fontSize: 12,
      color: t.dim,
      marginBottom: 14,
      lineHeight: 1.55,
    },
    dropZone: {
      border: `1.5px dashed ${t.borderMuted}`,
      borderRadius: 12,
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      background: t.card,
      transition: "border-color 0.15s, background 0.15s",
      minHeight: 120,
      gap: 6,
    },
    dropZoneActive: {
      borderColor: t.accent,
      background: t.chipActive,
    },
    dropZoneFilled: {
      alignItems: "flex-start",
      padding: "14px 14px",
    },
    uploadIcon: { marginBottom: 2 },
    dropText: {
      fontSize: 13,
      fontWeight: 600,
      color: t.muted,
    },
    dropHint: {
      fontSize: 11,
      color: t.dim,
    },
    fileList: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    fileRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      background: t.inputBg,
      borderRadius: 8,
      border: `1px solid ${t.border}`,
    },
    fileIcon: { fontSize: 14, flexShrink: 0 },
    fileName: {
      flex: 1,
      fontSize: 11,
      color: t.muted,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    fileSize: {
      fontSize: 10,
      color: t.dim,
      flexShrink: 0,
    },
    removeBtn: {
      background: "none",
      border: "none",
      color: t.dim,
      cursor: "pointer",
      fontSize: 11,
      padding: "2px 4px",
      flexShrink: 0,
    },
    addMoreHint: {
      fontSize: 10,
      color: t.dim,
      marginTop: 4,
      textAlign: "center",
      width: "100%",
    },
    uploadBtn: {
      marginTop: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: 10,
      border: "none",
      background: `linear-gradient(135deg, ${t.accent}, ${t.accentSoft})`,
      color: "#fff",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      width: "100%",
      boxShadow: `0 4px 16px ${t.accent}40`,
    },
    uploadBtnDisabled: {
      opacity: 0.4,
      cursor: "not-allowed",
      boxShadow: "none",
    },
    btnSpinner: {
      display: "inline-block",
      width: 12,
      height: 12,
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff",
      animation: "spin 0.7s linear infinite",
    },
    statusMsg: {
      marginTop: 10,
      padding: "8px 12px",
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 500,
    },
    statusSuccess: {
      background: t.successBg,
      border: `1px solid ${t.successBorder}`,
      color: t.successText,
    },
    statusError: {
      background: t.errBg,
      border: `1px solid ${t.errBorder}`,
      color: t.errText,
    },
    listSection: {
      marginTop: 22,
      borderTop: `1px solid ${t.border}`,
      paddingTop: 16,
    },
    listHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    listTitle: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.06em",
      color: t.dim,
      textTransform: "uppercase",
    },
    listHint: { fontSize: 11, color: t.dim },
    emptyDocs: { fontSize: 12, color: t.dim, margin: 0 },
    docList: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      maxHeight: 280,
      overflowY: "auto",
    },
    docRow: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 12px",
      background: t.inputBg,
      borderRadius: 10,
      border: `1px solid ${t.border}`,
    },
    docIcon: { fontSize: 16, lineHeight: 1, flexShrink: 0 },
    docMeta: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
    docName: {
      fontSize: 12,
      fontWeight: 600,
      color: t.muted,
      wordBreak: "break-word",
    },
    docDate: {
      fontSize: 10,
      color: t.dim,
    },
  };
}
