import React, { useState } from "react";

/**
 * InspectorInvitation — mobile web app invite screen.
 *
 * Props:
 *  - logoSrc:      Bison Valuation logo
 *  - logoMarkSrc:  optional alternate logo for the badge (falls back to logoSrc)
 *  - onContinue:   called when "Acknowledge & Continue" is pressed
 *  - onLogin:      optional; if provided, shows an "Already registered? Log in" link
 */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600&family=Inter:wght@400;500;600;700&display=swap');

.inv {
  --brand: #005581; --brand-press: #00456a; --brand-tint: #e8f1f6;
  --ink: #0f172a; --muted: #5b6b7b; --line: #e5e9ee;
  --pad: 24px;          /* one side padding used everywhere */
  --logo-zoom: 1.7;     /* make the logo bigger/smaller inside the badge */

  all: initial;
  display: flex; flex-direction: column; min-height: 100dvh; width: 100%;
  background: #00364f; color: var(--ink); color-scheme: light; text-align: left;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased; box-sizing: border-box;
}
.inv *, .inv *::before, .inv *::after { box-sizing: border-box; }
/* :where() keeps this reset at zero extra specificity so the classes below can set margins */
.inv :where(h1, h2, h3, p, ol) { margin: 0; }

/* ---------- Hero ---------- */
.inv__hero {
  position: relative; overflow: hidden; color: #fff; text-align: center;
  display: flex; flex-direction: column; align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 28px) var(--pad) 64px;
  background:
    radial-gradient(120% 80% at 85% -10%, rgba(64,170,225,.45) 0%, rgba(64,170,225,0) 55%),
    radial-gradient(90% 70% at 0% 100%, rgba(0,106,158,.6) 0%, rgba(0,106,158,0) 60%),
    linear-gradient(160deg, #006a9e 0%, #005581 50%, #00364f 100%);
}
.inv__hero::before, .inv__hero::after {
  content: ""; position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,.12); pointer-events: none;
}
.inv__hero::before { width: 360px; height: 360px; top: -140px; right: -140px; }
.inv__hero::after  { width: 240px; height: 240px; bottom: -120px; left: -90px; }

.inv__pill {
  position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 12px; border-radius: 999px; background: rgba(255,255,255,.14);
  border: 1px solid rgba(255,255,255,.22); backdrop-filter: blur(6px);
  font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; line-height: 1;
}
.inv__pill i { width: 6px; height: 6px; border-radius: 50%; background: #6ee7b7; display: block; }

.inv__badge-wrap { position: relative; z-index: 1; margin-top: 28px; width: 168px; height: 168px;
  display: flex; align-items: center; justify-content: center; }
.inv__ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.35);
  animation: inv-ping 2.8s cubic-bezier(.2,.6,.3,1) infinite; }
.inv__ring--2 { animation-delay: 1.4s; }
.inv__badge {
  position: relative; width: 136px; height: 136px; border-radius: 34px; background: #fff; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 18px 40px -12px rgba(0,20,40,.55), 0 0 0 6px rgba(255,255,255,.14);
}
.inv__logo { width: 100%; height: 100%; object-fit: contain; display: block; transform: scale(var(--logo-zoom)); }
.inv__wordmark { font-family: 'Source Serif 4', Georgia, serif; font-weight: 600; font-size: 24px; color: var(--brand); letter-spacing: .04em; }

.inv__brand { position: relative; z-index: 1; margin-top: 24px; font-family: 'Source Serif 4', Georgia, serif;
  font-weight: 600; font-size: 14px; line-height: 1; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.8); }
.inv__title { position: relative; z-index: 1; margin-top: 12px; font-size: 32px; line-height: 1.1; font-weight: 700; letter-spacing: -0.03em; }
.inv__lead { position: relative; z-index: 1; margin-top: 14px; max-width: 30ch; font-size: 15px; line-height: 1.55; color: rgba(255,255,255,.82); }

/* ---------- Sheet ---------- */
.inv__sheet {
  flex: 1; display: flex; flex-direction: column; background: #fff; margin-top: -28px;
  border-radius: 28px 28px 0 0; position: relative; z-index: 2;
  box-shadow: 0 -12px 32px -16px rgba(0,20,40,.35);
}
.inv__sheet-in { flex: 1; width: 100%; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column;
  padding: 28px var(--pad) calc(env(safe-area-inset-bottom, 0px) + 24px); }

.inv__h { font-size: 11px; line-height: 1; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }

.inv__steps { list-style: none; padding: 0; margin-top: 18px; display: flex; flex-direction: column; gap: 24px; }
.inv__step { position: relative; display: grid; grid-template-columns: 44px 1fr; align-items: start; column-gap: 16px; }
.inv__step:not(:last-child)::before {
  content: ""; position: absolute; left: 21px; top: 50px; bottom: -20px; width: 2px; border-radius: 1px;
  background: linear-gradient(var(--brand-tint), var(--line));
}
.inv__ico { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
  background: var(--brand-tint); color: var(--brand); }
.inv__step:first-child .inv__ico { background: linear-gradient(135deg, #006a9e, var(--brand)); color: #fff;
  box-shadow: 0 8px 18px -8px rgba(0,85,129,.6); }
.inv__txt { padding-top: 2px; }
.inv__st { font-size: 15px; line-height: 1.3; font-weight: 600; letter-spacing: -0.01em; color: var(--ink); }
.inv__sd { margin-top: 4px; font-size: 13.5px; line-height: 1.5; color: var(--muted); }

.inv__spacer { flex: 1; min-height: 32px; }

.inv__cta {
  appearance: none; width: 100%; height: 54px; padding: 0; border: 0; border-radius: 14px;
  background: linear-gradient(135deg, #006a9e 0%, var(--brand) 60%, #00456a 100%); color: #fff;
  font-family: inherit; font-size: 16px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 14px 28px -12px rgba(0,85,129,.7);
  transition: transform 140ms ease, box-shadow 200ms ease, filter 140ms ease;
  -webkit-tap-highlight-color: transparent;
}
.inv__cta:hover { filter: brightness(1.06); box-shadow: 0 18px 32px -12px rgba(0,85,129,.75); }
.inv__cta:active { transform: scale(.985); }
.inv__cta:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 3px; }
.inv__cta svg { transition: transform 200ms ease; }
.inv__cta:hover svg { transform: translateX(3px); }

.inv__login { margin-top: 14px; text-align: center; font-size: 14px; line-height: 1.4; color: var(--muted); }
.inv__login button { appearance: none; border: 0; background: none; padding: 4px; font: 600 14px 'Inter', system-ui, sans-serif;
  color: var(--brand); cursor: pointer; }
.inv__login button:hover { text-decoration: underline; }
.inv__login button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }

.inv__fine { margin: 16px auto 0; max-width: 34ch; text-align: center; font-size: 12.5px; line-height: 1.5; color: var(--muted); }
.inv__fine svg { display: inline-block; vertical-align: -2px; margin-right: 6px; }

/* ---------- Motion ---------- */
.inv__rise { animation: inv-rise 560ms cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--d, 0ms); }
@keyframes inv-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes inv-pop  { from { opacity: 0; transform: scale(.7); } to { opacity: 1; transform: none; } }
@keyframes inv-ping { 0% { transform: scale(.85); opacity: .7; } 80%, 100% { transform: scale(1.4); opacity: 0; } }
.inv__badge { animation: inv-pop 560ms cubic-bezier(.2,.8,.2,1) 80ms both; }

@media (prefers-reduced-motion: reduce) {
  .inv__rise, .inv__badge, .inv__ring { animation: none; }
  .inv__cta, .inv__cta svg { transition: none; }
}
`;

const Svg = ({ children, size = 22, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const STEPS = [
  {
    t: "Create your account",
    d: "Confirm your details and set a secure password.",
    icon: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>,
  },
  {
    t: "Accept your jobs",
    d: "Review each client request and engagement agreement.",
    icon: <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 14l2 2 4-4" /></Svg>,
  },
  {
    t: "Inspect and submit",
    d: "Log every part with photos, then send it to the admin.",
    icon: <Svg><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></Svg>,
  },
];

export default function InspectorInvitation({
  logoSrc = "/logo.png",
  logoMarkSrc,
  onContinue = () => {},
  onLogin,
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <>
      <style>{CSS}</style>
      <div className="inv">
        <header className="inv__hero">
          <span className="inv__pill inv__rise" style={{ "--d": "0ms" }}>
            <i /> Inspector Invite
          </span>

          <div className="inv__badge-wrap">
            <span className="inv__ring" />
            <span className="inv__ring inv__ring--2" />
            <div className="inv__badge">
              {logoFailed ? (
                <span className="inv__wordmark">BISON</span>
              ) : (
                <img className="inv__logo" src={logoMarkSrc || logoSrc} alt="Bison Valuation"
                     onError={() => setLogoFailed(true)} />
              )}
            </div>
          </div>

          <h2 className="inv__brand inv__rise" style={{ "--d": "160ms" }}>Bison Valuation</h2>
          <h1 className="inv__title inv__rise" style={{ "--d": "220ms" }}>You've been invited!  </h1>
          <p className="inv__lead inv__rise" style={{ "--d": "280ms" }}>
            Sign up to access the inspection dashboard.
          </p>
        </header>

        <main className="inv__sheet">
          <div className="inv__sheet-in">
            <p className="inv__h inv__rise" style={{ "--d": "340ms" }}>How it works</p>
            <ol className="inv__steps">
              {STEPS.map((s, i) => (
                <li key={s.t} className="inv__step inv__rise" style={{ "--d": `${400 + i * 80}ms` }}>
                  <span className="inv__ico">{s.icon}</span>
                  <div className="inv__txt">
                    <h3 className="inv__st">{s.t}</h3>
                    <p className="inv__sd">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="inv__spacer" />

            <button type="button" className="inv__cta inv__rise" style={{ "--d": "680ms" }} onClick={onContinue}>
              Acknowledge &amp; Continue
              <Svg size={20} sw={2.2}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
            </button>

            {onLogin && (
              <p className="inv__login inv__rise" style={{ "--d": "720ms" }}>
                Already registered? <button type="button" onClick={onLogin}>Log in</button>
              </p>
            )}

            
          </div>
        </main>
      </div>
    </>
  );
}