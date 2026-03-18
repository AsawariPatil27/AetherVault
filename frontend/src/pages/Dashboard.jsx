import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { logout } from "../services/auth";
import Upload from "../components/Upload";

function Dashboard() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // 🔥 WAIT UNTIL AUTH LOADS
  if (loading) {
    return <p style={{ color: "white", textAlign: "center" }}>Loading...</p>;
  }

  // 🔐 PROTECT ROUTE
  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <>
      <div className="dash-root">
        <div className="dash-card">

          <p className="dash-eyebrow">Portal</p>
          <h2 className="dash-title">
            Your <span>Dashboard</span>
          </h2>

          <div className="dash-divider" />

          <div className="dash-welcome-block">
            <div className="dash-avatar">
              {user.email?.[0] ?? "U"}
            </div>

            <div className="dash-welcome-text">
              <span className="dash-welcome-label">Signed in as</span>
              <span className="dash-email">{user.email}</span>
            </div>
          </div>

          <button className="dash-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>

          {/* 🔥 UPLOAD SECTION */}
          <div style={{ marginTop: "30px" }}>
            <Upload />
          </div>

        </div>
      </div>
    </>
  );
}

export default Dashboard;