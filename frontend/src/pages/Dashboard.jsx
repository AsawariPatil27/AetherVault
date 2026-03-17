import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { logout } from "../services/auth";

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Outfit:wght@300;400;500&display=swap');

        .dash-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #080f1e;
          background-image:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30, 64, 120, 0.45) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 90% 90%, rgba(15, 40, 90, 0.3) 0%, transparent 60%);
          font-family: 'Outfit', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .dash-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(
              0deg,
              transparent, transparent 39px,
              rgba(255,255,255,0.018) 39px, rgba(255,255,255,0.018) 40px
            ),
            repeating-linear-gradient(
              90deg,
              transparent, transparent 39px,
              rgba(255,255,255,0.018) 39px, rgba(255,255,255,0.018) 40px
            );
          pointer-events: none;
        }

        .dash-card {
          position: relative;
          width: 100%;
          max-width: 460px;
          margin: 24px;
          background: rgba(10, 20, 45, 0.85);
          border: 1px solid rgba(80, 130, 220, 0.18);
          border-radius: 4px;
          padding: 52px 44px 44px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 32px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(20, 60, 140, 0.15);
          backdrop-filter: blur(12px);
          animation: cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .dash-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #4a7fcb;
          margin-bottom: 10px;
          opacity: 0.9;
        }

        .dash-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #e8eef8;
          letter-spacing: 0.02em;
          margin: 0 0 36px 0;
          line-height: 1.1;
        }

        .dash-title span {
          color: #6fa3e8;
        }

        .dash-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(80, 130, 210, 0.2), transparent);
          margin: 0 0 28px 0;
        }

        .dash-welcome-block {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(80, 130, 210, 0.15);
          border-radius: 3px;
          margin-bottom: 28px;
        }

        .dash-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a4a9e, #0f2d6b);
          border: 1px solid rgba(80, 140, 230, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 500;
          color: #a0c0f0;
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .dash-welcome-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dash-welcome-label {
          font-size: 9.5px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(160, 185, 230, 0.45);
        }

        .dash-email {
          font-size: 13.5px;
          font-weight: 300;
          color: #c8d8f0;
          letter-spacing: 0.02em;
        }

        .dash-logout-btn {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(80, 130, 210, 0.25);
          border-radius: 3px;
          color: rgba(160, 185, 230, 0.55);
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .dash-logout-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          transition: left 0.5s ease;
        }

        .dash-logout-btn:hover::before {
          left: 100%;
        }

        .dash-logout-btn:hover {
          border-color: rgba(180, 80, 80, 0.4);
          color: rgba(220, 140, 140, 0.8);
          box-shadow: 0 0 20px rgba(150, 40, 40, 0.08);
          background: rgba(150, 40, 40, 0.06);
        }

        .dash-logout-btn:active {
          transform: scale(0.99);
        }

        .corner-accent {
          position: absolute;
          top: 0; right: 0;
          width: 60px; height: 60px;
          border-top: 1px solid rgba(80, 140, 230, 0.35);
          border-right: 1px solid rgba(80, 140, 230, 0.35);
          border-radius: 0 4px 0 0;
        }

        .corner-accent-bl {
          position: absolute;
          bottom: 0; left: 0;
          width: 40px; height: 40px;
          border-bottom: 1px solid rgba(80, 140, 230, 0.2);
          border-left: 1px solid rgba(80, 140, 230, 0.2);
          border-radius: 0 0 0 4px;
        }
      `}</style>

      <div className="dash-root">
        <div className="dash-card">
          <div className="corner-accent" />
          <div className="corner-accent-bl" />

          <p className="dash-eyebrow">Portal</p>
          <h2 className="dash-title">Your <span>Dashboard</span></h2>

          <div className="dash-divider" />

          <div className="dash-welcome-block">
            <div className="dash-avatar">
              {user?.email?.[0] ?? "U"}
            </div>
            <div className="dash-welcome-text">
              <span className="dash-welcome-label">Signed in as</span>
              <span className="dash-email">{user?.email}</span>
            </div>
          </div>

          <button className="dash-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

export default Dashboard;