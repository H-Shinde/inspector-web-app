import React, { useState } from "react";

/**
 * InspectorInvitation — mobile web app invite screen.
 *
 * Props:
 *  - logoSrc:      Bison Valuation stacked logo (hero)
 *  - logoMarkSrc:  optional smaller logo for the app bar (falls back to logoSrc)
 *  - onContinue:   called when "Acknowledge & Continue" is pressed
 */
export default function InspectorInvitation({
  logoSrc = "/logo.png",
  logoMarkSrc,
  onContinue = () => {},
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600&family=Inter:wght@400;500;600;700&display=swap');

        .inv {
          --brand: #005581;
          --brand-press: #00456a;
          --brand-tint: #e8f1f6;
          --ink: #0f172a;
          --muted: #5b6b7b;
          --line: #e5e9ee;

          /* explicit resets so template CSS (text-align, colors, padding) can't leak in */
          all: initial;
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          width: 100%;
          background: #ffffff;
          color: var(--ink);
          color-scheme: light;
          text-align: left;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          box-sizing: border-box;
        }
        .inv *, .inv *::before, .inv *::after { box-sizing: border-box; }
        .inv h1, .inv h2, .inv p { margin: 0; }

        /* App bar */
        .inv__bar {
          position: sticky;
          top: 0;
          z-index: 1;
          background: #fff;
          border-bottom: 1px solid var(--line);
          padding-top: env(safe-area-inset-top, 0px);
        }
        .inv__bar-inner {
          max-width: 480px;
          margin: 0 auto;
          height: 56px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .inv__bar-logo { height: 28px; width: auto; flex: none; }
        .inv__brand {
          flex: 1;
          min-width: 0;
          font-family: 'Source Serif 4', Georgia, serif;
          font-weight: 600;
          font-size: 18px;
          letter-spacing: -0.01em;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .inv__tag {
          flex: none;
          background: var(--brand-tint);
          color: var(--brand);
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          padding: 7px 10px;
          border-radius: 6px;
        }

        /* Body */
        .inv__main {
          flex: 1;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          padding: 28px 20px calc(env(safe-area-inset-bottom, 0px) + 20px);
        }
        .inv__title {
          font-size: 26px;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        .inv__body {
          margin-top: 10px;
          font-size: 15px;
          line-height: 1.55;
          color: var(--muted);
          max-width: 36ch;
        }

        .inv__hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 0;
        }
        .inv__hero-logo { width: min(62%, 240px); height: auto; display: block; }
        .inv__wordmark {
          font-weight: 600;
          letter-spacing: 0.3em;
          font-size: 22px;
          color: var(--brand);
        }

        /* Footer / CTA */
        .inv__cta {
          appearance: none;
          width: 100%;
          height: 52px;
          padding: 0;
          border: 0;
          border-radius: 12px;
          background: var(--brand);
          color: #fff;
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 120ms ease, transform 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .inv__cta:hover { background: var(--brand-press); }
        .inv__cta:active { background: var(--brand-press); transform: scale(0.99); }
        .inv__cta:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
        .inv__fine {
          margin-top: 14px;
          text-align: center;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--muted);
        }
        @media (prefers-reduced-motion: reduce) { .inv__cta { transition: none; } }
      `}</style>

      <div className="inv">
        <header className="inv__bar">
          <div className="inv__bar-inner">
            {!logoFailed && (
              <img
                className="inv__bar-logo"
                src={logoMarkSrc || logoSrc}
                alt=""
                aria-hidden="true"
                onError={() => setLogoFailed(true)}
              />
            )}
            <h2 className="inv__brand">Bison Valuation</h2>
            <span className="inv__tag">Inspector Invite</span>
          </div>
        </header>

        <main className="inv__main">
          <h1 className="inv__title">You've been invited</h1>
          <p className="inv__body">
            An administrator has requested your services. Sign up to access the
            inspection dashboard.
          </p>

          <div className="inv__hero">
            {logoFailed ? (
              <span className="inv__wordmark">BISON</span>
            ) : (
              <img
                className="inv__hero-logo"
                src={logoSrc}
                alt="Bison Valuation"
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>

          <button type="button" className="inv__cta" onClick={onContinue}>
            Acknowledge &amp; Continue
          </button>
          <p className="inv__fine">
            Access is by invitation only. Questions? Contact your administrator.
          </p>
        </main>
      </div>
    </>
  );
}