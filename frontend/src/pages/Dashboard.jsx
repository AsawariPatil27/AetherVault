import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { logout } from "../services/auth";
import { supabase } from "../services/supabase";
import ChatFilesPanel from "../components/ChatFilesPanel";
import ChatQueryPanel from "../components/ChatQueryPanel";
import { dashboardTokens } from "../dashboardTokens";

const API_BASE = "http://localhost:5000";
const THEME_KEY = "aethervault-theme";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export default function Dashboard() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "dark";
    } catch {
      return "dark";
    }
  });

  const t = dashboardTokens[themeMode === "light" ? "light" : "dark"];

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, themeMode);
    } catch {
      /* ignore */
    }
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
  }, [themeMode, t.bg, t.text]);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchChats = async () => {
    try {
      setFetchingChats(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await axios.get(`${API_BASE}/chat`, { headers });
      setChats(res.data.chats || []);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setFetchingChats(false);
    }
  };

  const handleCreateChat = async () => {
    try {
      setCreating(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await axios.post(`${API_BASE}/chat`, {}, { headers });
      const newChat = {
        _id: res.data.chatId,
        title: "New Chat",
        createdAt: new Date().toISOString(),
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(res.data.chatId);
    } catch (err) {
      console.error("Failed to create chat:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const openRename = () => {
    const chat = chats.find((c) => c._id === activeChatId);
    setRenameDraft(chat?.title || "New Chat");
    setRenameOpen(true);
  };

  const handleSaveRename = async () => {
    const title = renameDraft.trim();
    if (!activeChatId || !title) return;
    try {
      setRenaming(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      await axios.patch(`${API_BASE}/chat/${activeChatId}`, { title }, { headers });
      setChats((prev) =>
        prev.map((c) => (c._id === activeChatId ? { ...c, title } : c))
      );
      setRenameOpen(false);
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setRenaming(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeChatId) return;
    try {
      setDeleting(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      await axios.delete(`${API_BASE}/chat/${activeChatId}`, { headers });
      setActiveChatId(null);
      setDeleteConfirmOpen(false);
      await fetchChats();
    } catch (err) {
      console.error("Delete chat failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (user) fetchChats();
  }, [user]);

  const styles = useMemo(() => buildStyles(), []);

  if (loading) {
    return (
      <div style={{ ...styles.loadingScreen, background: t.bg }}>
        <div style={styles.spinner} />
        <p style={{ ...styles.loadingText, color: t.dim }}>Loading workspace…</p>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const activeChat = chats.find((c) => c._id === activeChatId);

  return (
    <div style={{ ...styles.root, background: t.bg, color: t.text }}>
      <aside
        style={{
          ...styles.sidebar,
          width: sidebarOpen ? 260 : 0,
          overflow: sidebarOpen ? "visible" : "hidden",
          background: t.sidebarBg,
          borderColor: t.border,
        }}
      >
        <div style={styles.sidebarInner}>
          <div style={{ ...styles.brand, borderColor: t.border }}>
            <span style={styles.brandDot} />
            <span style={{ ...styles.brandName, color: t.text }}>AetherVault</span>
          </div>

          <button
            style={{
              ...styles.newChatBtn,
              borderColor: t.borderMuted,
              color: t.muted,
            }}
            onClick={handleCreateChat}
            disabled={creating}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {creating ? "Creating…" : "New Chat"}
          </button>

          <div style={{ ...styles.chatListLabel, color: t.dim }}>RECENT</div>
          <div style={styles.chatList}>
            {fetchingChats ? (
              <p style={{ ...styles.dimText, color: t.dim }}>Loading…</p>
            ) : chats.length === 0 ? (
              <p style={{ ...styles.dimText, color: t.dim }}>No chats yet.</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat._id}
                  type="button"
                  style={{
                    ...styles.chatItem,
                    ...(activeChatId === chat._id
                      ? { ...styles.chatItemActive, background: t.chipActive, color: t.text }
                      : { color: t.muted }),
                  }}
                  onClick={() => setActiveChatId(chat._id)}
                >
                  <span style={styles.chatItemIcon}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path
                        d="M1 1h11v8H7.5L6.5 12l-1-3H1V1z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span style={styles.chatItemTitle}>{chat.title || "New Chat"}</span>
                  <span style={{ ...styles.chatItemDate, opacity: 0.45 }}>
                    {new Date(chat.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </button>
              ))
            )}
          </div>

          <div
            style={{
              ...styles.userFooter,
              borderColor: t.border,
              background: t.sidebarFooter,
            }}
          >
            <button
              type="button"
              style={{
                ...styles.themeMiniBtn,
                borderColor: t.border,
                color: t.muted,
              }}
              title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
            >
              {themeMode === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 0 0 21 14.5z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <div style={styles.avatarSmall}>{user.email?.[0]?.toUpperCase() ?? "U"}</div>
            <div style={styles.userInfo}>
              <span style={{ ...styles.userEmail, color: t.dim }}>{user.email}</span>
            </div>
            <button type="button" style={{ ...styles.logoutIcon, color: t.dim }} onClick={handleLogout} title="Sign out">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 2H2v12h4M11 5l3 3-3 3M14 8H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main style={{ ...styles.main, background: t.mainBg }}>
        <header
          style={{
            ...styles.topbar,
            borderColor: t.border,
            background: t.topbar,
          }}
        >
          <button type="button" style={{ ...styles.toggleBtn, color: t.dim }} onClick={() => setSidebarOpen((p) => !p)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <div style={styles.titleRow}>
            <span style={{ ...styles.chatTitle, color: t.muted }}>
              {activeChat ? activeChat.title || "New Chat" : "Select or create a chat"}
            </span>
            {activeChat && (
              <>
                <button type="button" style={{ ...styles.iconBtn, color: t.dim }} title="Rename chat" onClick={openRename}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 12.5-12.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  style={{ ...styles.iconBtn, color: "#f87171" }}
                  title="Delete chat"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7h16M10 11v6M14 11v6M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M8 7h8l-1 14a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1L8 7z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div style={styles.topbarSpacer} />

          <button
            type="button"
            style={{
              ...styles.themeToggle,
              borderColor: t.border,
              color: t.muted,
              background: t.card,
            }}
            onClick={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
          >
            {themeMode === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </header>

        <div style={{ ...styles.body, background: t.mainBg }}>
          {activeChatId ? (
            <div style={styles.workspaceRow}>
              <div style={styles.centerCol}>
                <ChatQueryPanel chatId={activeChatId} t={t} />
              </div>
              <div
                style={{
                  ...styles.rightCol,
                  borderColor: t.border,
                  background: t.sidebarBg,
                }}
              >
                <ChatFilesPanel chatId={activeChatId} t={t} onUploadDone={fetchChats} />
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="4" width="32" height="32" rx="10" stroke={t.borderMuted} strokeWidth="2" />
                  <path
                    d="M13 20h14M20 13v14"
                    stroke={t.accent}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h2 style={{ ...styles.emptyTitle, color: t.dim }}>No chat selected</h2>
              <p style={{ ...styles.emptySubtitle, color: t.dim }}>
                Create a new chat or pick one from the sidebar to search and upload documents.
              </p>
              <button
                type="button"
                style={styles.emptyBtn}
                onClick={handleCreateChat}
                disabled={creating}
              >
                {creating ? "Creating…" : "+ New Chat"}
              </button>
            </div>
          )}
        </div>
      </main>

      {renameOpen && (
        <div style={styles.modalOverlay} onClick={() => !renaming && setRenameOpen(false)}>
          <div
            style={{
              ...styles.modal,
              background: t.card,
              borderColor: t.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ ...styles.modalTitle, color: t.text }}>Rename chat</h4>
            <input
              style={{
                ...styles.modalInput,
                borderColor: t.border,
                background: t.inputBg,
                color: t.text,
              }}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              maxLength={200}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename();
                if (e.key === "Escape") setRenameOpen(false);
              }}
            />
            <div style={styles.modalActions}>
              <button
                type="button"
                style={{ ...styles.modalBtnGhost, borderColor: t.border, color: t.muted }}
                onClick={() => setRenameOpen(false)}
                disabled={renaming}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.modalBtnPrimary}
                onClick={handleSaveRename}
                disabled={renaming || !renameDraft.trim()}
              >
                {renaming ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && activeChat && (
        <div style={styles.modalOverlay} onClick={() => !deleting && setDeleteConfirmOpen(false)}>
          <div
            style={{
              ...styles.modal,
              background: t.card,
              borderColor: t.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ ...styles.modalTitle, color: t.text }}>Delete this chat?</h4>
            <p style={{ ...styles.modalBody, color: t.muted }}>
              This will remove <strong style={{ color: t.text }}>{activeChat.title || "this chat"}</strong> and all
              uploaded files and search data for it. This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={{ ...styles.modalBtnGhost, borderColor: t.border, color: t.muted }}
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.modalBtnDanger}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{globalStyles(t)}</style>
    </div>
  );
}

function buildStyles() {
  return {
    root: {
      display: "flex",
      height: "100vh",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      overflow: "hidden",
    },
    sidebar: {
      borderRight: "1px solid",
      transition: "width 0.25s ease",
      flexShrink: 0,
      position: "relative",
    },
    sidebarInner: {
      width: 260,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      overflow: "hidden",
    },
    brand: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "22px 20px 16px",
      borderBottom: "1px solid",
    },
    brandDot: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #6c6cff, #a78bfa)",
      boxShadow: "0 0 8px #6c6cff80",
    },
    brandName: {
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: "0.04em",
    },
    newChatBtn: {
      margin: "14px 14px 6px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid",
      background: "transparent",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.15s",
      letterSpacing: "0.02em",
    },
    chatListLabel: {
      padding: "14px 20px 6px",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.12em",
    },
    chatList: {
      flex: 1,
      overflowY: "auto",
      padding: "0 8px",
    },
    chatItem: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 12px",
      borderRadius: 8,
      border: "none",
      background: "transparent",
      fontSize: 13,
      cursor: "pointer",
      textAlign: "left",
      transition: "background 0.12s, color 0.12s",
      marginBottom: 2,
    },
    chatItemActive: {},
    chatItemIcon: {
      flexShrink: 0,
      opacity: 0.65,
    },
    chatItemTitle: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    chatItemDate: {
      fontSize: 10,
      flexShrink: 0,
    },
    userFooter: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 16px",
      borderTop: "1px solid",
    },
    themeMiniBtn: {
      flexShrink: 0,
      width: 34,
      height: 34,
      borderRadius: 8,
      border: "1px solid",
      background: "transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarSmall: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #6c6cff, #a78bfa)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 700,
      color: "#fff",
      flexShrink: 0,
    },
    userInfo: {
      flex: 1,
      overflow: "hidden",
    },
    userEmail: {
      display: "block",
      fontSize: 11,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    logoutIcon: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 4,
      display: "flex",
      alignItems: "center",
      transition: "color 0.12s",
    },
    dimText: {
      fontSize: 12,
      padding: "12px 12px",
    },

    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minWidth: 0,
    },
    topbar: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 20px",
      height: 60,
      borderBottom: "1px solid",
      flexShrink: 0,
    },
    toggleBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 4,
      display: "flex",
      alignItems: "center",
    },
    titleRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      minWidth: 0,
    },
    chatTitle: {
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: "0.01em",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: "min(40vw, 420px)",
    },
    iconBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 6,
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      borderRadius: 8,
    },
    topbarSpacer: { flex: 1 },
    themeToggle: {
      fontSize: 12,
      fontWeight: 600,
      padding: "8px 14px",
      borderRadius: 10,
      border: "1px solid",
      cursor: "pointer",
      flexShrink: 0,
    },

    body: {
      flex: 1,
      overflow: "auto",
      padding: "24px 24px 28px",
      minHeight: 0,
    },
    workspaceRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      gap: 0,
      height: "100%",
      minHeight: "min(70vh, 720px)",
      maxWidth: 1200,
      margin: "0 auto",
    },
    centerCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: 24,
      display: "flex",
      flexDirection: "column",
    },
    rightCol: {
      width: 320,
      flexShrink: 0,
      borderLeft: "1px solid",
      paddingLeft: 24,
      paddingBottom: 8,
    },

    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      gap: 14,
      textAlign: "center",
      paddingBottom: 60,
    },
    emptyIcon: {
      marginBottom: 6,
      opacity: 0.85,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 700,
      margin: 0,
    },
    emptySubtitle: {
      fontSize: 13,
      maxWidth: 340,
      lineHeight: 1.7,
      margin: 0,
    },
    emptyBtn: {
      marginTop: 8,
      padding: "10px 22px",
      borderRadius: 10,
      border: "none",
      background: "linear-gradient(135deg, #6c6cff, #a78bfa)",
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 4px 20px #6c6cff40",
    },

    loadingScreen: {
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    loadingText: {
      fontSize: 14,
    },
    spinner: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      border: "2px solid #1e1e2e",
      borderTopColor: "#6c6cff",
      animation: "spin 0.8s linear infinite",
    },

    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(8, 8, 14, 0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20,
    },
    modal: {
      width: "100%",
      maxWidth: 400,
      borderRadius: 14,
      border: "1px solid",
      padding: "22px 22px 18px",
      boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 14,
    },
    modalBody: {
      fontSize: 13,
      lineHeight: 1.65,
      marginBottom: 18,
    },
    modalInput: {
      width: "100%",
      padding: "11px 12px",
      borderRadius: 10,
      border: "1px solid",
      fontSize: 14,
      marginBottom: 18,
      outline: "none",
    },
    modalActions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
    },
    modalBtnGhost: {
      padding: "9px 16px",
      borderRadius: 10,
      border: "1px solid",
      background: "transparent",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    modalBtnPrimary: {
      padding: "9px 18px",
      borderRadius: 10,
      border: "none",
      background: "linear-gradient(135deg, #6c6cff, #a78bfa)",
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
    },
    modalBtnDanger: {
      padding: "9px 18px",
      borderRadius: 10,
      border: "none",
      background: "#b91c1c",
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
    },
  };
}

function globalStyles(t) {
  return `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  button:hover:not(:disabled) { opacity: 0.88; }
  button:disabled { opacity: 0.55; cursor: not-allowed; }
`;
}
