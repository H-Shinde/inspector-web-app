import React, { useState } from "react";
import InspectorShell from "./InspectorShell";

/**
 * Profile tab.
 * Props: name, email, inspectorId, jobs (for the stats), logoSrc, tab, onTab, onLogout
 */
const css = `
/* Spacing is done with flex gap (never margins on h1/p) so the shell's reset can't flatten it. */
.pf { display: flex; flex-direction: column; gap: 28px; }
.pf__sec { display: flex; flex-direction: column; gap: 10px; }

.pf__rise { animation: pf-rise 480ms cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i, 0) * 70ms); }
@keyframes pf-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes pf-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pf-up { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }

/* Hero */
.pf__hero { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding-top: 4px; }
.pf__avatar { width: 88px; height: 88px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #006a9e, var(--brand) 60%, #00405f); color: #fff;
  font-size: 30px; font-weight: 700; letter-spacing: .02em;
  box-shadow: 0 0 0 6px var(--brand-tint), 0 14px 28px -12px rgba(0,85,129,.6); }
.pf__id { display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 100%; }
.pf__name { font-size: 22px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; overflow-wrap: anywhere; }
.pf__role { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px;
  background: var(--brand-tint); color: var(--brand); font-size: 12px; font-weight: 600; line-height: 1; }
.pf__role::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--ok); }

/* Stats */
.pf__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.pf__stat { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px 14px; border-radius: 14px;
  background: #fff; border: 1px solid var(--line); box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.pf__stat b { font-size: 24px; line-height: 1; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.pf__stat span { font-size: 12px; line-height: 1.2; font-weight: 500; color: var(--muted); }

/* Sections */
.pf__h { font-size: 11px; line-height: 1; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); padding-left: 4px; }
.pf__card { padding: 4px 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.pf__row { display: flex; align-items: center; gap: 14px; padding: 14px 0; min-width: 0; }
.pf__row + .pf__row { border-top: 1px solid var(--line); }
.pf__ico { flex: none; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: var(--brand-tint); color: var(--brand); }
.pf__txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.pf__k { font-size: 12px; line-height: 1.2; font-weight: 500; color: var(--muted); }
.pf__v { font-size: 15px; line-height: 1.3; font-weight: 600; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.pf__v--soft { font-size: 14px; line-height: 1.45; font-weight: 500; letter-spacing: 0; color: var(--ink); }
.pf__mono { font-variant-numeric: tabular-nums; letter-spacing: .02em; }

/* Logout */
.pf__foot { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.pf__out { width: 100%; height: 52px; appearance: none; border-radius: 12px; border: 1px solid #fecdca; background: #fef3f2;
  color: var(--danger); font: 600 16px 'Inter', system-ui, sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background-color 140ms ease, transform 140ms ease; -webkit-tap-highlight-color: transparent; }
.pf__out:hover { background: #fee4e2; }
.pf__out:active { transform: scale(.99); }
.pf__out:focus-visible { outline: 3px solid rgba(180,35,24,.3); outline-offset: 2px; }
.pf__ver { font-size: 12px; line-height: 1.2; color: #94a3b8; text-align: center; }

/* Confirm sheet */
.pf__ov { position: fixed; inset: 0; z-index: 10; background: rgba(8,12,20,.5); display: flex; align-items: flex-end; justify-content: center; animation: pf-fade 180ms ease both; }
.pf__sheet { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 8px; background: #fff; border-radius: 22px 22px 0 0;
  padding: 24px 20px calc(env(safe-area-inset-bottom, 0px) + 20px); animation: pf-up 280ms cubic-bezier(.2,.8,.2,1) both; }
.pf__sheet-t { font-size: 18px; line-height: 1.3; font-weight: 700; letter-spacing: -0.01em; }
.pf__sheet-d { font-size: 14px; line-height: 1.5; color: var(--muted); }
.pf__btns { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pf__btn { height: 48px; appearance: none; border: 1px solid var(--line); border-radius: 12px; background: #fff; color: var(--ink); font: 600 15px 'Inter', system-ui, sans-serif; cursor: pointer; }
.pf__btn--out { background: var(--danger); border-color: var(--danger); color: #fff; }

@media (prefers-reduced-motion: reduce) { .pf__rise, .pf__ov, .pf__sheet { animation: none; } .pf__out { transition: none; } }
`;

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const initials = (name = "") =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

export default function Profile({
  name = "", email = "", inspectorId = "", jobs = [], logoSrc, tab = "profile", onTab, onLogout = () => {},
}) {
  const [confirm, setConfirm] = useState(false);

  const count = (s) => jobs.filter((j) => j.status === s).length;
  const stats = [
    { n: count("new"), l: "New" },
    { n: count("in-progress"), l: "In progress" },
    { n: count("submitted"), l: "Submitted" },
  ];

  const rows = [
    { k: "Full name", v: name, icon: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg> },
    { k: "Email", v: email, icon: <Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg> },
    { k: "Inspector ID", v: inspectorId, mono: true, icon: <Svg><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="9" cy="12" r="2" /><path d="M14 10h4M14 14h4" /></Svg> },
  ];

  return (
    <InspectorShell logoSrc={logoSrc} tab={tab} onTab={onTab} userName={name || "Profile"}>
      <style>{css}</style>

      <div className="pf">
        <div className="pf__hero pf__rise">
          <div className="pf__avatar" aria-hidden="true">{initials(name)}</div>
          <div className="pf__id">
            <h1 className="pf__name">{name || "Inspector"}</h1>
            <span className="pf__role">Inspector</span>
          </div>
        </div>

        <div className="pf__stats pf__rise" style={{ "--i": 1 }}>
          {stats.map((s) => (
            <div className="pf__stat" key={s.l}><b>{s.n}</b><span>{s.l}</span></div>
          ))}
        </div>

        <section className="pf__sec pf__rise" style={{ "--i": 2 }} aria-label="Account">
          <span className="pf__h">Account</span>
          <div className="ix__card pf__card">
            {rows.map((r) => (
              <div className="pf__row" key={r.k}>
                <span className="pf__ico">{r.icon}</span>
                <span className="pf__txt">
                  <span className="pf__k">{r.k}</span>
                  <span className={`pf__v${r.mono ? " pf__mono" : ""}`}>{r.v || "—"}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="pf__sec pf__rise" style={{ "--i": 3 }} aria-label="Support">
          <span className="pf__h">Support</span>
          <div className="ix__card pf__card">
            <div className="pf__row">
              <span className="pf__ico"><Svg><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Svg></span>
              <span className="pf__txt">
                <span className="pf__k">Need help?</span>
                <span className="pf__v pf__v--soft">Message your administrator from the Messages tab.</span>
              </span>
            </div>
          </div>
        </section>

        <div className="pf__foot pf__rise" style={{ "--i": 4 }}>
          <button type="button" className="pf__out" onClick={() => setConfirm(true)}>
            <Svg><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Svg>
            Log Out
          </button>
          <span className="pf__ver">Bison Valuation · Inspector app</span>
        </div>
      </div>

      {confirm && (
        <div className="pf__ov" onClick={() => setConfirm(false)}>
          <div className="pf__sheet" role="dialog" aria-label="Log out" onClick={(e) => e.stopPropagation()}>
            <h3 className="pf__sheet-t">Log out?</h3>
            <p className="pf__sheet-d">You'll need to log in again to see your jobs and messages.</p>
            <div className="pf__btns">
              <button type="button" className="pf__btn" onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" className="pf__btn pf__btn--out" onClick={onLogout}>Log Out</button>
            </div>
          </div>
        </div>
      )}
    </InspectorShell>
  );
}