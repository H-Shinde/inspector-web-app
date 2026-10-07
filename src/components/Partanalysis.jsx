import React, { useState } from "react";
import InspectorShell from "./InspectorShell";
import { partStatus, STATUS_LABEL } from "./parts";

/**
 * Screen 7 — Part analysis (opens when an inspector taps a current job).
 * Props: job ({ businessName|title, status, parts[] }), userName, logoSrc, onBack, onTab,
 *        onOpenPart(part), onAddPart(), onComplete(job) => Promise
 */
const css = `
.pa__rise { animation: pa-rise 480ms cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i, 0) * 60ms); }
@keyframes pa-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes pa-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pa-up { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }

.pa__top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.pa__top h1 { font-size: 22px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa__prog { flex: none; font-size: 14px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.pa__prog b { color: var(--ink); }
.pa__bar { margin-top: 12px; height: 6px; border-radius: 3px; background: #e5eaf0; overflow: hidden; }
.pa__bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #006a9e, var(--ok)); width: var(--w, 0%);
  transform-origin: left; animation: pa-grow 700ms cubic-bezier(.2,.8,.2,1) 200ms both; transition: width 400ms ease; }
@keyframes pa-grow { from { transform: scaleX(0); } to { transform: none; } }

.pa__tools { margin-top: 18px; display: flex; align-items: center; gap: 10px; position: relative; }
.pa__tools--open { z-index: 6; }
.pa__ib { flex: none; position: relative; width: 42px; height: 42px; appearance: none; border: 1px solid var(--line); border-radius: 12px; background: #fff;
  color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 140ms ease, border-color 160ms ease, background-color 160ms ease; }
.pa__ib:hover { border-color: #c9dde8; background: var(--brand-tint); }
.pa__ib:active { transform: scale(.92); }
.pa__ib:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.pa__ib--add { background: var(--brand); border-color: var(--brand); color: #fff; }
.pa__ib--add:hover { background: var(--brand-press); border-color: var(--brand-press); }
.pa__on { position: absolute; top: 7px; right: 7px; width: 8px; height: 8px; border-radius: 50%; background: #1d7de0; border: 2px solid #fff; box-sizing: content-box; }
.pa__search { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 14px; border: 1px solid var(--line);
  border-radius: 21px; background: #fff; color: var(--muted); transition: border-color 160ms ease, box-shadow 160ms ease; }
.pa__search:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(0,85,129,.14); }
.pa__search input { flex: 1; min-width: 0; border: 0; outline: none; background: none; font: 500 14px 'Inter', system-ui, sans-serif; color: var(--ink); }
.pa__search input::placeholder { color: #94a3b8; }
.pa__menu { position: absolute; z-index: 5; top: 50px; left: 0; min-width: 170px; padding: 6px; border-radius: 14px; background: #fff; border: 1px solid var(--line);
  box-shadow: 0 16px 32px -12px rgba(15,23,42,.3); transform-origin: top left; animation: pa-pop 160ms cubic-bezier(.2,.8,.2,1) both; }
@keyframes pa-pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: none; } }
.pa__mi { width: 100%; appearance: none; border: 0; background: none; text-align: left; padding: 10px 12px; border-radius: 9px; font: 500 14px 'Inter', system-ui, sans-serif;
  color: var(--ink); display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; }
.pa__mi:hover { background: var(--field); }
.pa__mi[aria-checked="true"] { color: var(--brand); font-weight: 600; }
.pa__shield { position: fixed; inset: 0; z-index: 4; }

.pa__card { margin-top: 14px; padding: 12px; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.pa__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.pa__part { position: relative; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; appearance: none; text-align: left;
  padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--field); color: var(--ink); font: 600 15px 'Inter', system-ui, sans-serif; cursor: pointer;
  transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 200ms ease; -webkit-tap-highlight-color: transparent; }
.pa__part:hover { background: #fff; border-color: #c9dde8; box-shadow: 0 10px 20px -12px rgba(0,85,129,.35); transform: translateY(-1px); }
.pa__part:active { transform: scale(.985); }
.pa__part:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.pa__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa__pill { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px 5px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1; }
.pa__pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pa__pill--completed { background: #dff5ea; color: #0e6b47; }
.pa__pill--in-progress { background: #fff4d6; color: #9a6200; }
.pa__pill--todo { background: #e6eaef; color: #4b5767; }
.pa__empty { padding: 28px 12px; text-align: center; font-size: 14px; line-height: 1.5; color: var(--muted); }

.pa__done { margin-top: 18px; width: 100%; height: 52px; appearance: none; border: 0; border-radius: 12px; background: var(--brand); color: #fff;
  font: 600 16px 'Inter', system-ui, sans-serif; cursor: pointer; transition: background-color 140ms ease, transform 140ms ease, opacity 140ms ease; }
.pa__done:hover { background: var(--brand-press); }
.pa__done:active { transform: scale(.99); }
.pa__done:disabled { opacity: .4; cursor: default; transform: none; }
.pa__done:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.pa__hint { margin-top: 8px; text-align: center; font-size: 12px; color: var(--muted); }
.pa__lock { margin-top: 14px; text-align: center; font-size: 13px; font-weight: 600; color: #0e6b47; background: #dff5ea; border-radius: 12px; padding: 12px; }

.pa__ov { position: fixed; inset: 0; z-index: 10; background: rgba(8,12,20,.5); display: flex; align-items: flex-end; justify-content: center; animation: pa-fade 180ms ease both; }
.pa__sheet { width: 100%; max-width: 480px; background: #fff; border-radius: 22px 22px 0 0; padding: 22px 20px calc(env(safe-area-inset-bottom, 0px) + 20px); animation: pa-up 280ms cubic-bezier(.2,.8,.2,1) both; }
.pa__sheet h3 { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.pa__sheet p { margin-top: 6px; font-size: 14px; line-height: 1.5; color: var(--muted); }
.pa__row { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pa__btn { height: 48px; appearance: none; border: 1px solid var(--line); border-radius: 12px; background: #fff; color: var(--ink); font: 600 15px 'Inter', system-ui, sans-serif; cursor: pointer; }
.pa__btn--go { background: var(--brand); border-color: var(--brand); color: #fff; }
.pa__btn:disabled { opacity: .6; cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .pa__rise, .pa__bar i, .pa__menu, .pa__ov, .pa__sheet { animation: none; }
  .pa__part, .pa__ib, .pa__done { transition: none; }
}
`;

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const FILTERS = [["all", "All parts"], ["completed", "Completed"], ["in-progress", "In progress"], ["todo", "To-do"]];

export default function PartAnalysis({
  job = {}, userName, logoSrc, onBack = () => {}, onTab,
  onOpenPart = () => {}, onAddPart = () => {}, onComplete = async () => {},
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const readOnly = job.status === "submitted";
  const parts = job.parts || [];
  const done = parts.filter((p) => partStatus(p) === "completed").length;
  const allDone = parts.length > 0 && done === parts.length;
  const shown = parts.filter((p) =>
    (filter === "all" || partStatus(p) === filter) && p.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function submit() {
    try { setBusy(true); setErr(""); await onComplete(job); }
    catch (e) { setErr(e?.message || "Couldn't submit. Please try again."); setBusy(false); }
  }

  return (
    <InspectorShell logoSrc={logoSrc} userName={userName} onBack={onBack} onTab={onTab}>
      <style>{css}</style>

      <div className="pa__top pa__rise">
        <h1>{job.businessName || job.title}</h1>
        <span className="pa__prog">Progress: <b>{done}/{parts.length}</b></span>
      </div>
      <div className="pa__bar pa__rise" style={{ "--i": 1 }} role="progressbar" aria-valuemin={0} aria-valuemax={parts.length} aria-valuenow={done}>
        <i style={{ "--w": parts.length ? `${(done / parts.length) * 100}%` : "0%" }} />
      </div>

      <div className={`pa__tools pa__rise${menu ? " pa__tools--open" : ""}`} style={{ "--i": 2 }}>
        <button type="button" className="pa__ib" onClick={() => setMenu((v) => !v)} aria-label="Filter parts" aria-haspopup="menu" aria-expanded={menu}>
          <Svg><path d="M3 5h18l-7 8v6l-4 2v-8z" /></Svg>
          {filter !== "all" && <span className="pa__on" />}
        </button>
        {menu && (
          <>
            <div className="pa__shield" onClick={() => setMenu(false)} />
            <div className="pa__menu" role="menu">
              {FILTERS.map(([k, l]) => (
                <button key={k} type="button" role="menuitemradio" aria-checked={filter === k} className="pa__mi"
                        onClick={() => { setFilter(k); setMenu(false); }}>
                  {l}{filter === k && <Svg size={16}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>}
                </button>
              ))}
            </div>
          </>
        )}
        <label className="pa__search">
          <input type="search" placeholder="Search part" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search parts" />
          <Svg size={18}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></Svg>
        </label>
        {!readOnly && (
          <button type="button" className="pa__ib pa__ib--add" onClick={onAddPart} aria-label="Add part"><Svg><path d="M12 5v14M5 12h14" /></Svg></button>
        )}
      </div>

      <div className="pa__card pa__rise" style={{ "--i": 3 }}>
        {shown.length ? (
          <ul className="pa__list">
            {shown.map((p, i) => {
              const st = partStatus(p);
              return (
                <li key={p.id} className="pa__rise" style={{ "--i": i + 4 }}>
                  <button type="button" className="pa__part" onClick={() => onOpenPart(p)}>
                    <span className="pa__name">{p.name}</span>
                    <span className={`pa__pill pa__pill--${st}`}>{STATUS_LABEL[st]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="pa__empty">
            {parts.length ? "No parts match your search or filter." : readOnly ? "No parts were recorded." : "No parts yet. Tap + to add the first one."}
          </p>
        )}
      </div>

      {readOnly ? (
        <p className="pa__lock">Submitted — this inspection is read-only.</p>
      ) : (
        <>
          <button type="button" className="pa__done" disabled={!allDone} onClick={() => setConfirm(true)}>Complete</button>
          {!allDone && <p className="pa__hint">{parts.length ? "Finish every part to complete the inspection." : "Add parts to get started."}</p>}
        </>
      )}

      {confirm && (
        <div className="pa__ov" onClick={() => !busy && setConfirm(false)}>
          <div className="pa__sheet" role="dialog" aria-label="Submit inspection" onClick={(e) => e.stopPropagation()}>
            <h3>Submit inspection?</h3>
            <p>All {parts.length} parts will be sent to the admin and you won't be able to edit them afterwards.</p>
            {err && <p style={{ color: "var(--danger)" }} role="alert">{err}</p>}
            <div className="pa__row">
              <button type="button" className="pa__btn" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" className="pa__btn pa__btn--go" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </InspectorShell>
  );
}