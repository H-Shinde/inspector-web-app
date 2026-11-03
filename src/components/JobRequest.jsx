import React, { useState } from "react";
import InspectorShell from "./InspectorShell";

/**
 * Screen 5 — Client job request (inspector-client-popup).
 * Props:
 *  - job:           { title, businessName, contactName, email, businessAddress, requestDate, compensation }
 *  - onBack:        back arrow
 *  - onAccept / onDecline: (job) => void | Promise  (throw to show an error)
 *  - onViewAgreement: document icon tapped
 */
const css = `
.jr__title { text-align: center; margin: 4px 0 16px; }
.jr__rows { margin: 0; padding: 4px 16px; }
.jr__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; padding: 18px 0; font-size: 13px; }
.jr__row + .jr__row { border-top: 1px solid var(--line); }
.jr__row dt { color: var(--ink); }
.jr__row dd { margin: 0; color: var(--ink); font-weight: 500; overflow-wrap: anywhere; }
.jr__agree { margin-top: 14px; display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.jr__agree label { flex: 1; display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; }
.jr__agree input { width: 18px; height: 18px; margin: 0; accent-color: var(--brand); }
.jr__doc { appearance: none; border: 0; background: none; padding: 4px; color: var(--muted); display: flex; cursor: pointer; border-radius: 6px; }
.jr__doc:hover { color: var(--ink); }
.jr__doc:focus-visible { outline: 2px solid var(--brand); }
.jr__err { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--danger); background: #fef3f2; border: 1px solid #fecdca; }
.jr__actions { display: flex; justify-content: center; gap: 16px; }
.jr__btn { appearance: none; border: 0; height: 48px; min-width: 120px; padding: 0 24px; border-radius: 12px; color: #fff;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: filter 120ms ease, transform 120ms ease; -webkit-tap-highlight-color: transparent; }
.jr__btn:hover { filter: brightness(.94); }
.jr__btn:active { transform: scale(.98); }
.jr__btn:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.jr__btn:disabled { opacity: .45; cursor: default; transform: none; filter: none; }
.jr__btn--accept { background: #16a34a; }
.jr__btn--decline { background: var(--danger); }
.jr__hint { margin-top: 10px; text-align: center; font-size: 12px; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { .jr__btn { transition: none; } }
`;

const money = (v) =>
  typeof v === "number"
    ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : v || "$0";

export default function JobRequest({
  job = {},
  userName,
  logoSrc,
  onBack = () => {},
  onTab,
  onAccept = () => {},
  onDecline = () => {},
  onViewAgreement = () => {},
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rows = [
    ["Business Name", job.businessName],
    ["Subject Contact Name", job.contactName],
    ["Subject Email", job.email],
    ["Business Address", job.businessAddress],
    ["Inspection Request Date", job.requestDate],
    ["Compensation", money(job.compensation)],
  ];

  async function run(action) {
    setError("");
    try {
      setBusy(true);
      await action(job);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <InspectorShell
      logoSrc={logoSrc}
      userName={userName}
      onBack={onBack}
      onTab={onTab}
      footer={
        <>
          <div className="jr__actions">
            <button type="button" className="jr__btn jr__btn--accept" disabled={!agreed || busy}
                    onClick={() => run(onAccept)}>Accept</button>
            <button type="button" className="jr__btn jr__btn--decline" disabled={busy}
                    onClick={() => run(onDecline)}>Decline</button>
          </div>
          {!agreed && <p className="jr__hint">Review and check the engagement agreement to accept.</p>}
        </>
      }
    >
      <style>{css}</style>
      <h1 className="ix__title jr__title">{job.title}</h1>

      <dl className="ix__card jr__rows">
        {rows.map(([k, v]) => (
          <div className="jr__row" key={k}>
            <dt>{k}:</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="ix__card jr__agree">
        <label>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          Engagement Agreement
        </label>
        <button type="button" className="jr__doc" onClick={onViewAgreement} aria-label="Read engagement agreement">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" /><path d="m9 14 2 2 4-4" />
          </svg>
        </button>
      </div>

      {error && <div className="jr__err" role="alert">{error}</div>}
    </InspectorShell>
  );
}