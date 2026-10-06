import React from "react";
import AppShell from "./AppShell";

/**
 * Screen 3 — Welcome / access granted.
 * Props: name, inspectorId, logoSrc, onContinue
 */
const css = `
.wl__badge { display: flex; justify-content: center; padding: 40px 0 36px; }
.wl__dot { width: 64px; height: 64px; border-radius: 50%; background: var(--ok); color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 12px rgba(26,169,113,.18), 0 0 0 24px rgba(26,169,113,.09);
  animation: wl-pop 480ms cubic-bezier(.2,.8,.2,1) both, wl-rings 700ms cubic-bezier(.2,.8,.2,1) 120ms both; }
.wl__check { stroke-dasharray: 1; stroke-dashoffset: 0;
  animation: wl-draw 420ms cubic-bezier(.65,0,.35,1) 380ms both; }

.wl__rise { animation: wl-rise 520ms cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--d, 0ms); }

@keyframes wl-pop   { from { transform: scale(.55); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes wl-rings { from { box-shadow: 0 0 0 0 rgba(26,169,113,0), 0 0 0 0 rgba(26,169,113,0); }
                      to   { box-shadow: 0 0 0 12px rgba(26,169,113,.18), 0 0 0 24px rgba(26,169,113,.09); } }
@keyframes wl-draw  { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes wl-rise  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .wl__dot, .wl__check, .wl__rise { animation: none; }
}
.wl__title { text-align: center; }
.wl__sub { text-align: center; margin: 10px auto 0; max-width: 34ch; }
.wl__sub b { color: var(--ink); font-weight: 700; }
.wl__params { margin-top: 28px; }
.wl__params-h { padding: 12px 16px; border-bottom: 1px solid var(--line); }
.wl__params-r { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.wl__id { font-weight: 700; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.wl__note { margin-top: 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px;
  background: #fafbfc; display: flex; gap: 10px; align-items: center; font-size: 12.5px; color: var(--muted); }
.wl__note svg { flex: none; color: var(--ink); }
`;

export default function Welcome({
  name = "John Doe",
  inspectorId = "BASE_INSP_0001",
  logoSrc,
  onContinue = () => {},
}) {
  return (
    <AppShell
      tag="Access Granted"
      logoSrc={logoSrc}
      footer={<button type="button" className="bv__cta" onClick={onContinue}>Continue</button>}
    >
      <style>{css}</style>
      <div className="wl__badge">
        <div className="wl__dot">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path className="wl__check" pathLength="1" d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
      </div>

      <h1 className="bv__title wl__title wl__rise" style={{ "--d": "500ms" }}>Welcome to Bison Valuation</h1>
      <p className="bv__sub wl__sub wl__rise" style={{ "--d": "600ms" }}>
        Welcome onboard, <b>{name}</b>. Your Inspector profile has been generated and verified.
      </p>

      <section className="bv__card wl__params wl__rise" style={{ "--d": "700ms" }} aria-label="Assigned inspector parameters">
        <div className="wl__params-h"><span className="bv__label">Assigned inspector parameters</span></div>
        <div className="wl__params-r">
          <span>Inspector ID</span>
          <span className="wl__id">{inspectorId}</span>
        </div>
      </section>

      <div className="wl__note wl__rise" style={{ "--d": "800ms" }} role="note">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
        </svg>
        You can now log in securely using your credentials.
      </div>
    </AppShell>
  );
}