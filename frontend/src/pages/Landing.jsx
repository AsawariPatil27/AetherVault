import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #03050c; margin: 0; }

        .lp {
          min-height: 100vh;
          background: #03050c;
          font-family: 'Inter', sans-serif;
          color: #64748b;
          overflow-x: hidden;
        }

        .lp::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(rgba(59,130,246,0.06) 1px, transparent 1px);
          background-size: 26px 26px;
        }

        .hero-glow {
          position: absolute; z-index: 0; pointer-events: none;
          top: -300px; left: 50%; transform: translateX(-50%);
          width: 1100px; height: 800px;
          background: radial-gradient(ellipse at 50% 35%, rgba(29,78,216,0.16) 0%, rgba(37,99,235,0.05) 45%, transparent 65%);
        }

        .z1 { position: relative; z-index: 1; }

        /* ── NAV ── */
        .nav {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 36px; height: 58px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky; top: 0; z-index: 100;
          background: rgba(3,5,12,0.88);
          backdrop-filter: blur(20px);
        }
        .nav-brand { grid-column: 2; display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .nav-gem {
          width: 26px; height: 26px; border-radius: 6px;
          background: linear-gradient(140deg, #1e3a8a, #2563eb);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(59,130,246,0.4), 0 2px 10px rgba(29,78,216,0.4);
          flex-shrink: 0;
        }
        .nav-name { font-size: 14px; font-weight: 600; color: #e2e8f0; letter-spacing: -0.02em; }
        .nav-right { grid-column: 3; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
        .nav-link {
          display: inline-block; text-decoration: none;
          padding: 6px 14px; border-radius: 6px;
          font-size: 13px; font-weight: 500; color: #475569;
          transition: color 0.15s;
        }
        .nav-link:hover { color: #94a3b8; }
        .nav-cta {
          display: inline-block; text-decoration: none;
          padding: 6px 16px; border-radius: 6px;
          font-size: 13px; font-weight: 600; color: #fff;
          background: #2563eb; border: 1px solid rgba(96,165,250,0.25);
          box-shadow: 0 2px 8px rgba(37,99,235,0.35);
          transition: all 0.18s;
        }
        .nav-cta:hover { background: #1d4ed8; box-shadow: 0 4px 14px rgba(37,99,235,0.45); }

        /* ── HERO ── */
        .hero-wrap { position: relative; overflow: hidden; }
        .hero { text-align: center; padding: 100px 24px 72px; max-width: 700px; margin: 0 auto; }

        .hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
          color: #3b82f6; margin-bottom: 28px;
          padding: 5px 14px; border-radius: 999px;
          border: 1px solid rgba(59,130,246,0.25);
          background: rgba(29,78,216,0.07);
        }
        .hero-dot { width: 4px; height: 4px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 6px #3b82f6; }

        .hero-h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(52px, 7vw, 86px);
          font-weight: 300; line-height: 1.06;
          letter-spacing: -0.02em; color: #f1f5f9;
          margin-bottom: 24px;
        }

        .hero-sub {
          font-size: 15px; font-weight: 400; line-height: 1.82;
          color: #475569; max-width: 440px; margin: 0 auto 36px;
        }
        .hero-sub strong { color: #60a5fa; font-weight: 500; }

        .hero-btns { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 56px; }
        .btn-blue {
          display: inline-block; text-decoration: none;
          padding: 11px 26px; border-radius: 7px;
          font-size: 13px; font-weight: 600; color: #fff;
          background: #2563eb;
          box-shadow: 0 3px 12px rgba(37,99,235,0.4);
          transition: all 0.2s;
        }
        .btn-blue:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.5); }
        .btn-muted {
          display: inline-block; text-decoration: none;
          padding: 11px 26px; border-radius: 7px;
          font-size: 13px; font-weight: 500; color: #475569;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.18s;
        }
        .btn-muted:hover { color: #94a3b8; border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.03); }

        /* ── MOCKUP ── */
        .mockup-wrap {
          max-width: 580px; margin: 0 auto;
          border-radius: 12px;
          border: 1px solid rgba(59,130,246,0.2);
          background: #060b18;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.5), 0 0 80px rgba(29,78,216,0.07);
          overflow: hidden;
        }
        .mockup-bar {
          display: flex; align-items: center; gap: 6px; padding: 11px 14px;
          background: #040810; border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .m-dot { width: 9px; height: 9px; border-radius: 50%; }
        .m-r { background: #ef4444; opacity: 0.5; } .m-y { background: #f59e0b; opacity: 0.5; } .m-g { background: #22c55e; opacity: 0.5; }
        .m-title { font-size: 11px; color: #1e293b; margin: 0 auto; }
        .mockup-body { padding: 18px 16px; display: flex; flex-direction: column; gap: 12px; }
        .msg-row { display: flex; flex-direction: column; }
        .msg-row-user { align-items: flex-end; }
        .msg-lbl { font-size: 10px; font-weight: 600; color: #1e293b; margin-bottom: 4px; letter-spacing: 0.05em; text-transform: uppercase; }
        .msg-lbl-r { text-align: right; }
        .bubble { display: inline-block; padding: 10px 14px; font-size: 12.5px; line-height: 1.6; border-radius: 10px; max-width: 88%; }
        .bubble-user { background: #1d4ed8; color: #bfdbfe; border-radius: 10px 10px 2px 10px; }
        .bubble-ai { background: #0d1526; color: #64748b; border: 1px solid rgba(59,130,246,0.15); border-radius: 10px 10px 10px 2px; }
        .bubble-ai-text { color: #94a3b8; margin-bottom: 8px; }
        .cites { display: flex; gap: 5px; flex-wrap: wrap; }
        .cite { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: rgba(37,99,235,0.12); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }

        /* ── STRIP ── */
        .strip { display: flex; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .strip-item { flex: 1; text-align: center; padding: 22px 12px; border-right: 1px solid rgba(255,255,255,0.06); }
        .strip-item:last-child { border-right: none; }
        .strip-val { display: block; font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #60a5fa; letter-spacing: -0.02em; margin-bottom: 2px; }
        .strip-lbl { font-size: 10px; font-weight: 500; color: #334155; letter-spacing: 0.08em; text-transform: uppercase; }

        /* ── DIVIDER ── */
        .divider { height: 1px; background: rgba(255,255,255,0.06); }

        /* ── FEATURES ── */
        .features-section { padding: 88px 40px; max-width: 1020px; margin: 0 auto; }
        .features-layout { display: grid; grid-template-columns: 260px 1fr; gap: 80px; align-items: start; }

        .feat-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #2563eb; margin-bottom: 14px; }
        .feat-sidebar-h2 { font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 300; color: #cbd5e1; line-height: 1.2; letter-spacing: -0.01em; margin-bottom: 16px; }
        .feat-sidebar-h2 em { font-style: italic; color: #60a5fa; }
        .feat-sidebar-p { font-size: 13px; line-height: 1.8; color: #334155; }
        .rag-badge { display: inline-block; margin-top: 16px; padding: 4px 10px; border-radius: 5px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; background: rgba(29,78,216,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); }

        .feat-list { border: 1px solid rgba(59,130,246,0.15); border-radius: 12px; overflow: hidden; }
        .feat-item { display: flex; gap: 14px; align-items: flex-start; padding: 20px 20px; border-bottom: 1px solid rgba(59,130,246,0.1); transition: background 0.18s; }
        .feat-item:last-child { border-bottom: none; }
        .feat-item:hover { background: rgba(29,78,216,0.04); }
        .feat-icon-box { width: 32px; height: 32px; border-radius: 7px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(29,78,216,0.1); border: 1px solid rgba(59,130,246,0.2); color: #60a5fa; margin-top: 1px; }
        .feat-title { font-size: 13.5px; font-weight: 600; color: #cbd5e1; margin-bottom: 4px; letter-spacing: -0.01em; }
        .feat-desc { font-size: 12.5px; line-height: 1.72; color: #334155; }

        /* ── STEPS ── */
        .steps-section { padding: 88px 40px; background: rgba(4,9,22,0.6); border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .steps-inner { max-width: 900px; margin: 0 auto; }
        .steps-head { text-align: center; margin-bottom: 56px; }
        .steps-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #2563eb; margin-bottom: 12px; }
        .steps-h2 { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 3.5vw, 42px); font-weight: 300; color: #cbd5e1; letter-spacing: -0.01em; }
        .steps-h2 em { font-style: italic; color: #60a5fa; }

        .steps-flow { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .step-card {
          background: #060b18;
          border: 1px solid rgba(59,130,246,0.18);
          border-radius: 12px; padding: 28px 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: border-color 0.22s, transform 0.22s, box-shadow 0.22s;
        }
        .step-card:hover { border-color: rgba(59,130,246,0.35); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .step-num { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; font-size: 11px; font-weight: 700; color: #3b82f6; background: rgba(29,78,216,0.1); border: 1px solid rgba(59,130,246,0.25); margin-bottom: 18px; }
        .step-title { font-size: 14px; font-weight: 600; color: #cbd5e1; margin-bottom: 8px; letter-spacing: -0.01em; }
        .step-desc { font-size: 12.5px; line-height: 1.76; color: #334155; }

        /* ── CLOSING CTA ── */
        .closing-section { padding: 88px 24px 100px; text-align: center; }
        .closing-h2 { font-family: 'Cormorant Garamond', serif; font-size: clamp(34px, 4.5vw, 58px); font-weight: 300; color: #f1f5f9; letter-spacing: -0.02em; line-height: 1.08; margin-bottom: 16px; }
        .closing-h2 em { font-style: italic; color: #60a5fa; }
        .closing-sub { font-size: 14px; color: #334155; margin-bottom: 32px; }
        .closing-btns { display: flex; align-items: center; justify-content: center; gap: 8px; }

        /* ── FOOTER ── */
        .footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 22px 40px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .footer-copy { font-size: 12px; color: #1e293b; }
        .footer-links { display: flex; gap: 20px; }
        .footer-links a { font-size: 12px; color: #1e293b; text-decoration: none; transition: color 0.15s; }
        .footer-links a:hover { color: #3b82f6; }

        @media (max-width: 700px) {
          .features-layout { grid-template-columns: 1fr; gap: 40px; }
          .steps-flow { grid-template-columns: 1fr; gap: 14px; }
          .strip { flex-wrap: wrap; }
          .strip-item { min-width: 50%; }
          .nav { padding: 0 16px; }
          .features-section { padding: 64px 20px; }
          .steps-section { padding: 64px 20px; }
          .footer { padding: 20px; }
        }
      `}</style>

      <div className="lp">
        <div className="hero-wrap">
          <div className="hero-glow" />
          <div className="z1">

            {/* ── Nav ── */}
            <nav className="nav">
              <div />
              <Link to="/" className="nav-brand">
                <span className="nav-gem">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="nav-name">AetherVault</span>
              </Link>
              <div className="nav-right">
                <Link to="/login" className="nav-link">Sign in</Link>
                <Link to="/signup" className="nav-cta">Get started</Link>
              </div>
            </nav>

            {/* ── Hero ── */}
            <section className="hero">
              <div className="hero-tag">
                <span className="hero-dot" />
                RAG-Powered · Document Intelligence
              </div>
              <h1 className="hero-h1">Talk to your documents.</h1>
              <p className="hero-sub">
                Upload any PDF, image, audio or video and ask it anything.
                Powered by <strong>Retrieval-Augmented Generation</strong> — precise,
                source-backed answers every time.
              </p>
              <div className="hero-btns">
                <Link to="/signup" className="btn-blue">Get started free</Link>
                <Link to="/login" className="btn-muted">Sign in →</Link>
              </div>

              {/* Mockup */}
              <div className="mockup-wrap">
                <div className="mockup-bar">
                  <span className="m-dot m-r" /><span className="m-dot m-y" /><span className="m-dot m-g" />
                  <span className="m-title">AetherVault — Research Report.pdf</span>
                </div>
                <div className="mockup-body">
                  <div className="msg-row msg-row-user">
                    <div className="msg-lbl msg-lbl-r">You</div>
                    <div className="bubble bubble-user">What are the key findings in section 3?</div>
                  </div>
                  <div className="msg-row">
                    <div className="msg-lbl">AetherVault</div>
                    <div className="bubble bubble-ai">
                      <div className="bubble-ai-text">
                        Section 3 outlines three primary findings. The hybrid retrieval approach yielded 94% accuracy — significantly outperforming keyword-only search across all document types.
                      </div>
                      <div className="cites">
                        <span className="cite">§3.1 Methodology</span>
                        <span className="cite">§3.4 Results</span>
                        <span className="cite">Fig. 7</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        <div className="z1">

          {/* ── Strip ── */}
          <div className="strip">
            {[
              { val: "6+", lbl: "File types" },
              { val: "RAG", lbl: "Architecture" },
              { val: "100%", lbl: "Cited answers" },
              { val: "3", lbl: "AI modes" },
            ].map((s) => (
              <div key={s.lbl} className="strip-item">
                <span className="strip-val">{s.val}</span>
                <span className="strip-lbl">{s.lbl}</span>
              </div>
            ))}
          </div>

          {/* ── Features ── */}
          <section className="features-section">
            <div className="features-layout">
              <div>
                <div className="feat-label">Capabilities</div>
                <h2 className="feat-sidebar-h2">Built for serious<br /><em>document work</em></h2>
                <p className="feat-sidebar-p">
                  From raw file ingestion to conversational AI — everything runs on a RAG pipeline that retrieves only what's relevant, then generates a grounded response.
                </p>
                <span className="rag-badge">Retrieval-Augmented Generation</span>
              </div>
              <div className="feat-list">
                {[
                  {
                    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 3h6l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 3v4h4M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                    title: "Any file format",
                    desc: "PDFs, images, audio, video — drop anything in and it gets parsed, chunked, and indexed automatically.",
                  },
                  {
                    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/></svg>,
                    title: "Cited answers only",
                    desc: "Every response traces back to the exact passage it came from. No hallucination, no vague summaries.",
                  },
                  {
                    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="M16.5 16.5L21 21M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                    title: "Hybrid search",
                    desc: "Semantic vector search fused with keyword matching via Reciprocal Rank Fusion — always the most relevant chunk.",
                  },
                  {
                    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="5" cy="17" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="19" cy="17" r="2" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v4M12 11l-5 4M12 11l5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                    title: "Visual mind maps",
                    desc: "Ask for a concept breakdown and get a zoomable diagram — not just another wall of text.",
                  },
                  {
                    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1.6"/><path d="M19 10a7 7 0 0 1-14 0M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                    title: "Audio mode",
                    desc: "Hear answers read aloud in the language you asked in — including Marathi, Arabic, and more.",
                  },
                  {
                    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
                    title: "Persistent conversations",
                    desc: "Your history survives every session and modality switch. Come back a week later and continue mid-thought.",
                  },
                ].map((f) => (
                  <div key={f.title} className="feat-item">
                    <div className="feat-icon-box">{f.icon}</div>
                    <div>
                      <div className="feat-title">{f.title}</div>
                      <div className="feat-desc">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="divider" />

          {/* ── Steps ── */}
          <section className="steps-section">
            <div className="steps-inner">
              <div className="steps-head">
                <div className="steps-lbl">How it works</div>
                <h2 className="steps-h2">Three steps. <em>That's really it.</em></h2>
              </div>
              <div className="steps-flow">
                {[
                  { n: "01", title: "Upload your files", desc: "Drop in any file. Watch the RAG pipeline parse, chunk, and embed your content in real time." },
                  { n: "02", title: "Ask a question", desc: "Type anything in plain language. AetherVault retrieves the right passages and streams a cited answer back." },
                  { n: "03", title: "Explore the answer", desc: "Switch to Mind Map for a visual breakdown, Audio to hear it, or keep asking follow-up questions." },
                ].map((s) => (
                  <div key={s.n} className="step-card">
                    <div className="step-num">{s.n}</div>
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Closing CTA ── */}
          <section className="closing-section">
            <h2 className="closing-h2">
              Your files have more<br /><em>to say than you think.</em>
            </h2>
            <p className="closing-sub">Start for free. No credit card required.</p>
            <div className="closing-btns">
              <Link to="/signup" className="btn-blue">Create an account</Link>
              <Link to="/login" className="btn-muted">Sign in</Link>
            </div>
          </section>

          {/* ── Footer ── */}
          <footer className="footer">
            <span className="footer-copy">© 2026 AetherVault</span>
            <div className="footer-links">
              <Link to="/login">Sign in</Link>
              <Link to="/signup">Sign up</Link>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
