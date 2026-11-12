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
.jr__enter { animation: jr-enter 420ms cubic-bezier(.2,.8,.2,1) both; }
@keyframes jr-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.jr__eyebrow { display: inline-flex; align-items: center; gap: 7px; color: var(--brand); background: var(--brand-tint); padding: 6px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.jr__eyebrow::before { content: ''; width: 6px; height: 6px; background: currentColor; border-radius: 50%; }
.ix .jr__title { margin: 12px 0 6px; overflow-wrap: anywhere; font-size: 26px; }
.ix .jr__intro { color: var(--muted); font-size: 13px; line-height: 1.5; margin-bottom: 18px; }
.jr__summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; animation-delay: 60ms; }
.jr__metric { border: 1px solid var(--line); border-radius: 14px; padding: 16px; background: #fff; min-width: 0; }
.jr__metric:first-child { background: var(--brand); color: #fff; border-color: var(--brand); }
.jr__metric strong { display: block; font-size: 25px; line-height: 1.2; letter-spacing: -.03em; overflow-wrap: anywhere; }
.jr__metric span { display: block; font-size: 12px; margin-top: 6px; opacity: .8; }
.jr__details { padding: 18px; animation-delay: 120ms; }
.ix .jr__details h2 { margin: 0 0 4px; color: var(--ink); font-size: 15px; font-weight: 700; }
.jr__rows { margin: 0; }
.jr__row { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 14px; align-items: baseline; padding: 13px 0; font-size: 13px; line-height: 1.5; }
.jr__row + .jr__row { border-top: 1px solid var(--line); }
.jr__row:last-child { padding-bottom: 0; }
.jr__row dt { color: var(--muted); }
.jr__row dd { margin: 0; color: var(--ink); font-weight: 500; overflow-wrap: anywhere; }
.jr__agree { margin-top: 14px; padding: 16px; animation-delay: 180ms; transition: border-color 180ms ease, background 180ms ease; }
.jr__agree--checked { border-color: #82b7a0; background: #f0faf5; }
.jr__agree-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.jr__agree-title { font-size: 14px; font-weight: 600; }
.jr__agree label { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; line-height: 1.5; color: var(--muted); cursor: pointer; }
.jr__agree input { flex: none; width: 18px; height: 18px; margin: 0; accent-color: var(--brand); }
.jr__doc { appearance: none; border: 0; background: var(--brand-tint); padding: 7px 10px; color: var(--brand); display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border-radius: 8px; }
.jr__doc:hover { background: #d9e9f3; }
.jr__doc:focus-visible, .jr__btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; }
.jr__err { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--danger); background: #fef3f2; border: 1px solid #fecdca; }
.jr__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.jr__btn { appearance: none; border: 1px solid transparent; height: 46px; padding: 0 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 160ms ease, transform 160ms ease; }
.jr__btn:active { transform: scale(.98); }
.jr__btn:disabled { opacity: .45; cursor: default; transform: none; }
.jr__btn--accept { background: var(--brand); color: #fff; }
.jr__btn--accept:hover:not(:disabled) { background: var(--brand-press); }
.jr__btn--decline { background: #fff; border-color: #e2c4c4; color: var(--danger); }
.jr__btn--decline:hover:not(:disabled) { background: #fef3f2; }
.ix .jr__hint { margin: 0 0 10px; font-size: 11px; line-height: 1.5; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { .jr__enter { animation: none; } .jr__btn, .jr__agree { transition: none; } }
`;

function requestDate(value) {
  if (!value) return 'Not provided';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
        ["Contact", job.contactName],
    ["Email", job.email],
    ["Address", job.businessAddress],
    ["Request date", requestDate(job.requestDate)],
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
          {!agreed && <p className="jr__hint">Review the agreement and check the box to accept.</p>}
          <div className="jr__actions">
            <button type="button" className="jr__btn jr__btn--accept" disabled={!agreed || busy}
                    onClick={() => run(onAccept)}>Accept Job</button>
            <button type="button" className="jr__btn jr__btn--decline" disabled={busy}
                    onClick={() => run(onDecline)}>Decline</button>
          </div>
        </>
      }
    >
      <style>{css}</style>
      <div className="jr__enter">
        <span className="jr__eyebrow">New assignment</span>
        <h1 className="ix__title jr__title">{job.businessName || job.title}</h1>
        <p className="jr__intro">Review the job details before accepting.</p>
      </div>
      <div className="jr__summary jr__enter">
        <div className="jr__metric"><strong>{job.expectedItemCount ?? 0}</strong><span>Total items</span></div>
        <div className="jr__metric"><strong>{money(job.compensation)}</strong><span>Compensation</span></div>
      </div>
      <section className="ix__card jr__details jr__enter" aria-label="Job details">
      <h2>Job details</h2>
      <dl className="jr__rows">
        {rows.map(([k, v]) => (
          <div className="jr__row" key={k}>
            <dt>{k}:</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>
      </section>

      <div className={`ix__card jr__agree jr__enter ${agreed ? 'jr__agree--checked' : ''}`}>
        <div className="jr__agree-top"><span className="jr__agree-title">Engagement agreement</span>
        <button type="button" className="jr__doc" onClick={onViewAgreement} aria-label="Read engagement agreement">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" /><path d="m9 14 2 2 4-4" />
          </svg>
          Read
        </button></div>
        <label>
          <input type="checkbox" disabled={busy} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          I have reviewed and agree to the engagement agreement.
        </label>
      </div>

      {error && <div className="jr__err" role="alert">{error}</div>}
    </InspectorShell>
  );
}
