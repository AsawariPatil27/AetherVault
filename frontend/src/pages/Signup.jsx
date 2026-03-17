import { useState } from "react";
import { Link } from "react-router-dom";
import { signUp } from "../services/auth";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");

    const { data, error } = await signUp(email, password);

    if (error) {
      if (error.message.includes("User already registered")) {
        setMessage("⚠️ Email already exists. Please login.");
      } else {
        setMessage(error.message);
      }
      return;
    }

    if (data?.user && data?.session === null) {
      setMessage("📩 Email already registered or verification required. Try logging in.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Outfit:wght@300;400;500&display=swap');

        .signup-root {
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

        .signup-root::before {
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

        .signup-card {
          position: relative;
          width: 100%;
          max-width: 420px;
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

        .signup-eyebrow {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #4a7fcb;
          margin-bottom: 10px;
          opacity: 0.9;
        }

        .signup-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #e8eef8;
          letter-spacing: 0.02em;
          margin: 0 0 38px 0;
          line-height: 1.1;
        }

        .signup-title span {
          color: #6fa3e8;
        }

        .input-group {
          margin-bottom: 20px;
          position: relative;
        }

        .input-label {
          display: block;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(160, 185, 230, 0.6);
          margin-bottom: 8px;
        }

        .signup-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(80, 130, 210, 0.2);
          border-radius: 3px;
          padding: 13px 16px;
          color: #d8e4f5;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 300;
          letter-spacing: 0.03em;
          outline: none;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          box-sizing: border-box;
        }

        .signup-input::placeholder {
          color: rgba(160, 185, 230, 0.25);
        }

        .signup-input:focus {
          border-color: rgba(80, 150, 230, 0.55);
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 0 3px rgba(60, 120, 210, 0.1), 0 0 20px rgba(60, 120, 210, 0.08);
        }

        .signup-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(80, 130, 210, 0.2), transparent);
          margin: 28px 0;
        }

        .signup-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #1a4a9e 0%, #0f2d6b 100%);
          border: 1px solid rgba(80, 140, 230, 0.35);
          border-radius: 3px;
          color: #c8dcf8;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(10, 30, 100, 0.5);
        }

        .signup-button::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
          transition: left 0.5s ease;
        }

        .signup-button:hover::before {
          left: 100%;
        }

        .signup-button:hover {
          background: linear-gradient(135deg, #1f58bf 0%, #132f75 100%);
          border-color: rgba(100, 160, 255, 0.5);
          color: #ddeeff;
          box-shadow: 0 6px 28px rgba(15, 40, 130, 0.6), 0 0 0 1px rgba(100, 160, 255, 0.1);
          transform: translateY(-1px);
        }

        .signup-button:active {
          transform: translateY(0);
        }

        .signup-message {
          margin-top: 18px;
          padding: 11px 14px;
          background: rgba(255, 200, 60, 0.06);
          border: 1px solid rgba(255, 200, 60, 0.18);
          border-radius: 3px;
          font-size: 12.5px;
          font-weight: 300;
          color: rgba(220, 190, 120, 0.85);
          letter-spacing: 0.02em;
          line-height: 1.5;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .signup-footer {
          margin-top: 22px;
          text-align: center;
          font-size: 12.5px;
          font-weight: 300;
          color: rgba(160, 185, 230, 0.4);
          letter-spacing: 0.02em;
        }

        .signup-footer a {
          color: #5b96e0;
          text-decoration: none;
          font-weight: 400;
          transition: color 0.2s;
        }

        .signup-footer a:hover {
          color: #88bcf5;
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

      <div className="signup-root">
        <div className="signup-card">
          <div className="corner-accent" />
          <div className="corner-accent-bl" />

          <p className="signup-eyebrow">Get started</p>
          <h2 className="signup-title">Create <span>Account</span></h2>

          <form onSubmit={handleSignup}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                className="signup-input"
                type="email"
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="signup-input"
                type="password"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="signup-divider" />

            <button className="signup-button" type="submit">
              Create Account
            </button>
          </form>

          {message && <p className="signup-message">{message}</p>}

          <p className="signup-footer">
            Already have an account?&nbsp;<Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default Signup;