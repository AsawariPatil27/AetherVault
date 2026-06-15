import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { logout } from "../services/auth";
import { supabase } from "../services/supabase";
import ChatFilesPanel from "../components/ChatFilesPanel";
import ChatQueryPanel from "../components/ChatQueryPanel";
import { dashboardTokens, dashboardType } from "../dashboardTokens";

const API_BASE = "http://localhost:5000";
const THEME_KEY = "aethervault-theme";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

/** Mongo/API ids may be string or object — normalize for comparisons */
function normalizeChatId(id) {
  if (id == null) return "";
  if (typeof id === "object" && id.$oid) return String(id.$oid);
  return String(id);
}

function normalizeChat(chat) {
  if (!chat) return chat;
  return { ...chat, _id: normalizeChatId(chat._id) };
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
  const [filesPanelOpen, setFilesPanelOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchChats = async () => {
    try {
      setFetchingChats(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await axios.get(`${API_BASE}/chat`, { headers });
      const list = (res.data.chats || []).map(normalizeChat);
      setChats(list);
      setActiveChatId((current) => {
        const cur = normalizeChatId(current);
        if (!cur) return null;
        if (list.some((c) => normalizeChatId(c._id) === cur)) return cur;
        return list.length ? normalizeChatId(list[0]._id) : null;
      });
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
      const newId = normalizeChatId(res.data.chatId);
      const newChat = {
        _id: newId,
        title: "New Chat",
        createdAt: new Date().toISOString(),
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newId);
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
    const chat = chats.find(
      (c) => normalizeChatId(c._id) === normalizeChatId(activeChatId)
    );
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
      const id = normalizeChatId(activeChatId);
      setChats((prev) =>
        prev.map((c) => (normalizeChatId(c._id) === id ? { ...c, title } : c))
      );
      setRenameOpen(false);
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setRenaming(false);
    }
  };

  const handleConfirmDelete = async () => {
    const deletedId = normalizeChatId(activeChatId);
    if (!deletedId) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      const headers = await getAuthHeaders();
      if (!headers) {
        setDeleteError("Not signed in.");
        return;
      }

      await axios.delete(`${API_BASE}/chat/${deletedId}`, { headers });

      const nextChats = chats.filter(
        (c) => normalizeChatId(c._id) !== deletedId
      );
      setChats(nextChats);
      setActiveChatId(
        nextChats.length ? normalizeChatId(nextChats[0]._id) : null
      );
      setDeleteConfirmOpen(false);

      fetchChats().catch((err) => console.error("Refresh chats failed:", err));
    } catch (err) {
      const msg =
        err.response?.data?.error || err.message || "Failed to delete chat";
      setDeleteError(msg);
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

  const activeId = normalizeChatId(activeChatId);
  const activeChat = chats.find((c) => normalizeChatId(c._id) === activeId);

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
              color: t.text,
            }}
            onClick={handleCreateChat}
            disabled={creating}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {creating ? "Creating…" : "New Chat"}
          </button>

          <div style={{ ...styles.chatListLabel, color: t.label }}>RECENT</div>
          <div style={styles.chatList}>
            {fetchingChats ? (
              <p style={{ ...styles.dimText, color: t.dim }}>Loading…</p>
            ) : chats.length === 0 ? (
              <p style={{ ...styles.dimText, color: t.dim }}>No chats yet.</p>
            ) : (
              chats.map((chat) => {
                const chatId = normalizeChatId(chat._id);
                return (
                <button
                  key={chatId}
                  type="button"
                  style={{
                    ...styles.chatItem,
                    ...(activeId === chatId
                      ? { ...styles.chatItemActive, background: t.chipActive, color: t.text }
                      : { color: t.body }),
                  }}
                  onClick={() => setActiveChatId(chatId)}
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
                  <span style={{ ...styles.chatItemDate, color: t.dim }}>
                    {new Date(chat.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </button>
              );
              })
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
            <span style={{ ...styles.chatTitle, color: t.text }}>
              {activeChat ? activeChat.title || "New Chat" : "Select or create a chat"}
            </span>
            {activeChat && (
              <>
                <button
                  type="button"
                  className="icon-btn-hover"
                  style={{ ...styles.iconBtn, color: t.muted }}
                  title="Rename chat"
                  onClick={openRename}
                >
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
                  className="delete-chat-btn icon-btn-hover"
                  style={{ ...styles.iconBtn, color: t.muted }}
                  title="Delete chat"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4 7h16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9 7V5.2a1.2 1.2 0 0 1 1.2-1.2h3.6a1.2 1.2 0 0 1 1.2 1.2V7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 7l.65 11.1c.08 1.2 1.1 2.15 2.3 2.15h4.1c1.2 0 2.22-.95 2.3-2.15L17 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 11v5.5M14 11v5.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div style={styles.topbarSpacer} />

          {activeId && (
            <button
              type="button"
              style={{
                ...styles.themeToggle,
                borderColor: t.border,
                color: filesPanelOpen ? t.accent : t.muted,
                background: t.card,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
              onClick={() => setFilesPanelOpen((p) => !p)}
              title={filesPanelOpen ? "Hide files panel" : "Show files panel"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M8 4h13M8 12h13M8 20h13M3 4h.01M3 12h.01M3 20h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Files
            </button>
          )}

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
          {activeId ? (
            <div style={styles.workspaceRow}>
              <div style={styles.centerCol}>
                <ChatQueryPanel
                  key={activeId}
                  chatId={activeId}
                  t={t}
                  onTitleUpdate={(id, title) =>
                    setChats((prev) => prev.map((c) => normalizeChatId(c._id) === id ? { ...c, title } : c))
                  }
                />
              </div>
              <div
                style={{
                  ...styles.rightCol,
                  borderColor: t.border,
                  background: t.sidebarBg,
                  width: filesPanelOpen ? 360 : 0,
                  paddingLeft: filesPanelOpen ? 32 : 0,
                  overflow: "hidden",
                  transition: "width 0.25s ease, padding 0.25s ease",
                }}
              >
                {filesPanelOpen && (
                  <ChatFilesPanel
                    key={activeId}
                    chatId={activeId}
                    t={t}
                    onUploadDone={fetchChats}
                  />
                )}
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
              <h2 style={{ ...styles.emptyTitle, color: t.text }}>No chat selected</h2>
              <p style={{ ...styles.emptySubtitle, color: t.body }}>
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
            <p style={{ ...styles.modalBody, color: t.body }}>
              This will remove <strong style={{ color: t.text }}>{activeChat.title || "this chat"}</strong> and all
              uploaded files and search data for it. This cannot be undone.
            </p>
            {deleteError && (
              <p style={{ ...styles.modalBody, color: "#f87171", marginTop: 0 }}>
                {deleteError}
              </p>
            )}
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
  const ty = dashboardType;
  return {
    root: {
      display: "flex",
      height: "100vh",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      fontSize: ty.base,
      lineHeight: 1.5,
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
      fontSize: ty.lg,
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    newChatBtn: {
      margin: "14px 14px 6px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "11px 14px",
      borderRadius: 10,
      border: "1px solid",
      background: "transparent",
      fontSize: ty.sm,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.15s",
    },
    chatListLabel: {
      padding: "14px 20px 8px",
      fontSize: ty.xs,
      fontWeight: 700,
      letterSpacing: "0.08em",
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
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      border: "none",
      background: "transparent",
      fontSize: ty.sm,
      fontWeight: 500,
      cursor: "pointer",
      textAlign: "left",
      transition: "background 0.12s, color 0.12s",
      marginBottom: 4,
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
      lineHeight: 1.35,
    },
    chatItemDate: {
      fontSize: ty.xs,
      flexShrink: 0,
      fontWeight: 500,
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
      fontSize: ty.xs,
      fontWeight: 500,
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
      fontSize: ty.sm,
      padding: "12px 12px",
      lineHeight: 1.5,
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
      padding: "0 24px",
      height: 64,
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
      fontSize: ty.md,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: "min(40vw, 480px)",
      lineHeight: 1.3,
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
      fontSize: ty.sm,
      fontWeight: 600,
      padding: "9px 16px",
      borderRadius: 10,
      border: "1px solid",
      cursor: "pointer",
      flexShrink: 0,
    },

    body: {
      flex: 1,
      overflow: "auto",
      padding: "28px 32px 32px",
      minHeight: 0,
    },
    workspaceRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      gap: 0,
      height: "100%",
      minHeight: "min(72vh, 780px)",
      maxWidth: 1360,
      margin: "0 auto",
    },
    centerCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: 32,
      display: "flex",
      flexDirection: "column",
    },
    rightCol: {
      width: 360,
      flexShrink: 0,
      borderLeft: "1px solid",
      paddingLeft: 32,
      paddingBottom: 8,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
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
      fontSize: ty.xl,
      fontWeight: 700,
      margin: 0,
      letterSpacing: "-0.03em",
    },
    emptySubtitle: {
      fontSize: ty.base,
      maxWidth: 400,
      lineHeight: 1.65,
      margin: 0,
    },
    emptyBtn: {
      marginTop: 8,
      padding: "12px 24px",
      borderRadius: 10,
      border: "none",
      background: "linear-gradient(135deg, #6c6cff, #a78bfa)",
      color: "#fff",
      fontSize: ty.sm,
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
      fontSize: ty.base,
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
      fontSize: ty.lg,
      fontWeight: 700,
      marginBottom: 12,
      letterSpacing: "-0.02em",
    },
    modalBody: {
      fontSize: ty.base,
      lineHeight: 1.65,
      marginBottom: 20,
    },
    modalInput: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid",
      fontSize: ty.base,
      marginBottom: 18,
      outline: "none",
      lineHeight: 1.45,
    },
    modalActions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
    },
    modalBtnGhost: {
      padding: "10px 18px",
      borderRadius: 10,
      border: "1px solid",
      background: "transparent",
      fontSize: ty.sm,
      fontWeight: 600,
      cursor: "pointer",
    },
    modalBtnPrimary: {
      padding: "10px 20px",
      borderRadius: 10,
      border: "none",
      background: "linear-gradient(135deg, #6c6cff, #a78bfa)",
      color: "#fff",
      fontSize: ty.sm,
      fontWeight: 700,
      cursor: "pointer",
    },
    modalBtnDanger: {
      padding: "10px 20px",
      borderRadius: 10,
      border: "none",
      background: "#b91c1c",
      color: "#fff",
      fontSize: ty.sm,
      fontWeight: 700,
      cursor: "pointer",
    },
  };
}

function globalStyles(t) {
  return `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 8px; }
  textarea::placeholder, input::placeholder { color: ${t.dim}; opacity: 1; }
  textarea:focus-visible, input:focus-visible {
    outline: 2px solid ${t.accent};
    outline-offset: 2px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  .delete-chat-btn:hover {
    opacity: 1 !important;
    background: ${t.errBg};
    color: ${t.errText};
  }
  .delete-chat-btn:active { transform: scale(0.94); }
  .icon-btn-hover:hover { background: ${t.chipActive}; opacity: 1 !important; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
`;
}
