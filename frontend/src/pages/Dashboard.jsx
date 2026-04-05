import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { logout } from "../services/auth";
import Upload from "../components/Upload";
import axios from "axios";
import { supabase } from "../services/supabase";

const API_BASE = "http://localhost:5000";

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

export default function Dashboard() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(false);

  // Fetch all chats for this user
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
      const newChat = { _id: res.data.chatId, title: "New Chat", createdAt: new Date().toISOString() };
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

  useEffect(() => {
    if (user) fetchChats();
  }, [user]);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading workspace…</p>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const activeChat = chats.find((c) => c._id === activeChatId);

  return (
    <div style={styles.root}>
      {/* ── SIDEBAR ── */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? 260 : 0, overflow: sidebarOpen ? "visible" : "hidden" }}>
        <div style={styles.sidebarInner}>
          {/* Brand */}
          <div style={styles.brand}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>AetherVault</span>
          </div>

          {/* New chat button */}
          <button style={styles.newChatBtn} onClick={handleCreateChat} disabled={creating}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {creating ? "Creating…" : "New Chat"}
          </button>

          {/* Chat list */}
          <div style={styles.chatListLabel}>RECENT</div>
          <div style={styles.chatList}>
            {fetchingChats ? (
              <p style={styles.dimText}>Loading…</p>
            ) : chats.length === 0 ? (
              <p style={styles.dimText}>No chats yet.</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat._id}
                  style={{
                    ...styles.chatItem,
                    ...(activeChatId === chat._id ? styles.chatItemActive : {}),
                  }}
                  onClick={() => setActiveChatId(chat._id)}
                >
                  <span style={styles.chatItemIcon}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M1 1h11v8H7.5L6.5 12l-1-3H1V1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={styles.chatItemTitle}>{chat.title || "New Chat"}</span>
                  <span style={styles.chatItemDate}>
                    {new Date(chat.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* User footer */}
          <div style={styles.userFooter}>
            <div style={styles.avatarSmall}>{user.email?.[0]?.toUpperCase() ?? "U"}</div>
            <div style={styles.userInfo}>
              <span style={styles.userEmail}>{user.email}</span>
            </div>
            <button style={styles.logoutIcon} onClick={handleLogout} title="Sign out">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H2v12h4M11 5l3 3-3 3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={styles.main}>
        {/* Top bar */}
        <header style={styles.topbar}>
          <button style={styles.toggleBtn} onClick={() => setSidebarOpen((p) => !p)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span style={styles.chatTitle}>
            {activeChat ? activeChat.title || "New Chat" : "Select or create a chat"}
          </span>
        </header>

        {/* Body */}
        <div style={styles.body}>
          {activeChatId ? (
            <Upload chatId={activeChatId} onUploadDone={fetchChats} />
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="4" width="32" height="32" rx="10" stroke="#3b3b4f" strokeWidth="2" />
                  <path d="M13 20h14M20 13v14" stroke="#6c6cff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2 style={styles.emptyTitle}>No chat selected</h2>
              <p style={styles.emptySubtitle}>
                Create a new chat or pick one from the sidebar to start uploading documents.
              </p>
              <button style={styles.emptyBtn} onClick={handleCreateChat} disabled={creating}>
                {creating ? "Creating…" : "+ New Chat"}
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{globalStyles}</style>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    background: "#0d0d14",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: "#e4e4f0",
    overflow: "hidden",
  },

  // SIDEBAR
  sidebar: {
    background: "#111120",
    borderRight: "1px solid #1e1e2e",
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
    borderBottom: "1px solid #1e1e2e",
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
    color: "#e4e4f0",
  },
  newChatBtn: {
    margin: "14px 14px 6px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #2a2a40",
    background: "linear-gradient(135deg, #1c1c30, #22223a)",
    color: "#a5a5c0",
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
    color: "#44445a",
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
    color: "#7a7a9a",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.12s, color 0.12s",
    marginBottom: 2,
  },
  chatItemActive: {
    background: "#1c1c38",
    color: "#c8c8e8",
  },
  chatItemIcon: {
    flexShrink: 0,
    opacity: 0.6,
  },
  chatItemTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chatItemDate: {
    fontSize: 10,
    opacity: 0.4,
    flexShrink: 0,
  },
  userFooter: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 16px",
    borderTop: "1px solid #1e1e2e",
    background: "#0f0f1e",
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
    color: "#5a5a7a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  logoutIcon: {
    background: "none",
    border: "none",
    color: "#44445a",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    transition: "color 0.12s",
  },
  dimText: {
    fontSize: 12,
    color: "#3a3a54",
    padding: "12px 12px",
  },

  // MAIN
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "0 24px",
    height: 60,
    borderBottom: "1px solid #1a1a2a",
    background: "#0d0d14",
    flexShrink: 0,
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#44445a",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    transition: "color 0.12s",
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#7070a0",
    letterSpacing: "0.01em",
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: "30px 32px",
  },

  // EMPTY STATE
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
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#4a4a6a",
    margin: 0,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#3a3a54",
    maxWidth: 320,
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
    transition: "opacity 0.15s",
  },

  // LOADING
  loadingScreen: {
    height: "100vh",
    background: "#0d0d14",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: "#44445a",
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
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d14; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a40; border-radius: 4px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  button:hover { opacity: 0.85; }
`;