import { useState } from "react";
import axios from "axios";
import { supabase } from "../services/supabase";

const API_BASE = "http://localhost:5000";

/**
 * Upload component.
 * Props:
 *  - chatId: string  (managed by Dashboard, never shown to user)
 *  - onUploadDone: () => void  (optional callback after successful upload)
 */
export default function Upload({ chatId, onUploadDone }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error", message: string }
  const [dragging, setDragging] = useState(false);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setStatus(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(dropped);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!chatId) {
      setStatus({ type: "error", message: "No active chat. Please create one first." });
      return;
    }
    if (!files.length) {
      setStatus({ type: "error", message: "Please select at least one file." });
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
      files.forEach((f) => formData.append("files", f));

      await axios.post(`${API_BASE}/upload`, formData, { headers });

      setStatus({ type: "success", message: `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully.` });
      setFiles([]);
      onUploadDone?.();
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Upload failed";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={styles.root}>
      <h3 style={styles.heading}>Upload Documents</h3>
      <p style={styles.sub}>Attach PDFs, images, audio, or video files to this chat.</p>

      {/* Drop zone */}
      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneActive : {}),
          ...(files.length > 0 ? styles.dropZoneFilled : {}),
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input").click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,image/*,audio/*,video/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {files.length === 0 ? (
          <>
            <div style={styles.uploadIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 22V10M10 16l6-6 6 6" stroke="#6c6cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="4" y="4" width="24" height="24" rx="8" stroke="#2a2a48" strokeWidth="1.5" />
              </svg>
            </div>
            <p style={styles.dropText}>
              {dragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p style={styles.dropHint}>or click to browse · PDF, image, audio, video</p>
          </>
        ) : (
          <div style={styles.fileList} onClick={(e) => e.stopPropagation()}>
            {files.map((f, i) => (
              <div key={i} style={styles.fileRow}>
                <span style={styles.fileIcon}>{fileIcon(f.type)}</span>
                <span style={styles.fileName}>{f.name}</span>
                <span style={styles.fileSize}>{formatSize(f.size)}</span>
                <button style={styles.removeBtn} onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
            <p style={styles.addMoreHint}>Click to add more files</p>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        style={{
          ...styles.uploadBtn,
          ...(loading || !files.length ? styles.uploadBtnDisabled : {}),
        }}
        onClick={handleUpload}
        disabled={loading || !files.length}
      >
        {loading ? (
          <span style={styles.btnSpinner} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 10V2M3 6l4-4 4 4M2 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {loading ? "Processing…" : `Upload ${files.length > 0 ? `(${files.length})` : ""}`}
      </button>

      {/* Status message */}
      {status && (
        <div style={{ ...styles.statusMsg, ...(status.type === "success" ? styles.statusSuccess : styles.statusError) }}>
          {status.type === "success" ? "✓" : "✕"} {status.message}
        </div>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    maxWidth: 600,
    margin: "0 auto",
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: "#c8c8e8",
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: "#4a4a6a",
    marginBottom: 20,
    lineHeight: 1.6,
  },
  dropZone: {
    border: "1.5px dashed #2a2a48",
    borderRadius: 14,
    padding: "36px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: "#111120",
    transition: "border-color 0.15s, background 0.15s",
    minHeight: 160,
    gap: 8,
  },
  dropZoneActive: {
    borderColor: "#6c6cff",
    background: "#14143a",
  },
  dropZoneFilled: {
    alignItems: "flex-start",
    padding: "20px 24px",
  },
  uploadIcon: {
    marginBottom: 4,
  },
  dropText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#6060a0",
  },
  dropHint: {
    fontSize: 12,
    color: "#3a3a54",
  },
  fileList: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    background: "#0d0d1a",
    borderRadius: 8,
    border: "1px solid #1e1e2e",
  },
  fileIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    color: "#9090c0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileSize: {
    fontSize: 11,
    color: "#3a3a54",
    flexShrink: 0,
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#44445a",
    cursor: "pointer",
    fontSize: 11,
    padding: "2px 4px",
    flexShrink: 0,
    transition: "color 0.1s",
  },
  addMoreHint: {
    fontSize: 11,
    color: "#3a3a54",
    marginTop: 4,
    textAlign: "center",
  },
  uploadBtn: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 24px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #6c6cff, #a78bfa)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 20px #6c6cff30",
    transition: "opacity 0.15s",
    letterSpacing: "0.02em",
  },
  uploadBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  btnSpinner: {
    display: "inline-block",
    width: 13,
    height: 13,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    animation: "spin 0.7s linear infinite",
  },
  statusMsg: {
    marginTop: 14,
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  statusSuccess: {
    background: "#0d2a1c",
    border: "1px solid #1a4a30",
    color: "#4ade80",
  },
  statusError: {
    background: "#2a0d0d",
    border: "1px solid #4a1a1a",
    color: "#f87171",
  },
};