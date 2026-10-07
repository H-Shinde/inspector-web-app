import React, { useRef, useState } from "react";
import InspectorShell from "./InspectorShell";
import { FIELDS, emptyPart, partStatus } from "./parts";

/**
 * Screens 8 & 9 — Inspection sheet. Edit a part (pass `part`) or add one (omit `part`).
 * Props: job, part?, userName, logoSrc, onBack, onTab, onSave(part) => Promise (throw to show an error)
 */
const css = `
.sh__rise { animation: sh-rise 480ms cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i, 0) * 60ms); }
@keyframes sh-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes sh-pop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: none; } }

.sh__top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.sh__top h1, .sh__name { font-size: 22px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; min-width: 0; }
.sh__top h1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sh__name { flex: 1; width: 100%; padding: 6px 0; border: 0; border-bottom: 2px dashed #cfd8e1; outline: none; background: none; color: var(--ink);
  font-family: inherit; border-radius: 0; transition: border-color 160ms ease; }
.sh__name:focus { border-bottom-color: var(--brand); border-bottom-style: solid; }
.sh__name[aria-invalid="true"] { border-bottom-color: var(--danger); }
.sh__prog { flex: none; font-size: 14px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.sh__prog b { color: var(--ink); }

.sh__card { margin-top: 16px; padding: 18px 16px; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.sh__f { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 14px; }
.sh__f + .sh__f { margin-top: 12px; }
.sh__f label { text-align: right; font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.sh__in, .sh__ta { width: 100%; border: 1px solid var(--line); border-radius: 10px; background: var(--field); color: var(--ink); outline: none; appearance: none;
  font: 500 15px 'Inter', system-ui, sans-serif; transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease; }
.sh__in { height: 44px; padding: 0 12px; }
.sh__in:focus, .sh__ta:focus { border-color: var(--brand); background: #fff; box-shadow: 0 0 0 3px rgba(0,85,129,.14); }
.sh__ta { margin-top: 16px; min-height: 96px; padding: 12px; resize: vertical; line-height: 1.45; }
.sh__ta::placeholder, .sh__in::placeholder { color: #94a3b8; font-weight: 400; }
.sh__hint { margin-top: 12px; font-size: 12px; line-height: 1.5; color: var(--muted); }

.sh__ph { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
.sh__th { position: relative; width: 64px; height: 64px; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); animation: sh-pop 240ms cubic-bezier(.2,.8,.2,1) both; }
.sh__th img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sh__x { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; padding: 0; appearance: none; border: 0; border-radius: 50%; background: rgba(15,23,42,.7); color: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer; }

.sh__err { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--danger); background: #fef3f2; border: 1px solid #fecdca; }
.sh__ferr { margin-top: 6px; font-size: 12px; color: var(--danger); }

.sh__bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding-top: 10px; border-top: 1px solid var(--line); }
.sh__save { grid-column: 2; height: 48px; min-width: 148px; padding: 0 28px; appearance: none; border: 0; border-radius: 12px; background: var(--brand); color: #fff;
  font: 600 15px 'Inter', system-ui, sans-serif; cursor: pointer; transition: background-color 140ms ease, transform 140ms ease, opacity 140ms ease; }
.sh__save:hover { background: var(--brand-press); }
.sh__save:active { transform: scale(.97); }
.sh__save:disabled { opacity: .6; cursor: default; transform: none; }
.sh__save:focus-visible, .sh__cam:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.sh__cam { position: relative; grid-column: 3; justify-self: end; width: 44px; height: 44px; appearance: none; border: 1px solid var(--line); border-radius: 12px; background: #fff;
  color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 140ms ease, background-color 160ms ease; }
.sh__cam:hover { background: var(--brand-tint); color: var(--brand); }
.sh__cam:active { transform: scale(.9); }
.sh__n { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--brand); color: #fff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; animation: sh-pop 200ms ease both; }

@media (prefers-reduced-motion: reduce) { .sh__rise, .sh__th, .sh__n { animation: none; } .sh__save, .sh__cam, .sh__in, .sh__ta { transition: none; } }
`;

const MODE = { qty: "numeric", year: "numeric", mileage: "numeric" };

export default function InspectionSheet({
  job = {}, part, userName, logoSrc, onBack = () => {}, onTab, onSave = async () => {},
}) {
  const adding = !part;
  const initial = useRef(part || emptyPart()).current;
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tried, setTried] = useState(false);
  const camRef = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const nameErr = tried && !form.name.trim();

  const parts = job.parts || [];
  const done = parts.filter((p) => partStatus(p) === "completed").length;

  function back() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onBack();
  }

  function addPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // TODO: upload `file` to storage and keep the returned URL instead of this local preview URL.
    setForm((f) => ({ ...f, photos: [...f.photos, { id: `ph${Date.now()}`, name: file.name, url: URL.createObjectURL(file), file }] }));
  }

  async function save() {
    setTried(true);
    setErr("");
    if (!form.name.trim()) return;
    try { setBusy(true); await onSave({ ...form, name: form.name.trim() }); }
    catch (e) { setErr(e?.message || "Couldn't save. Please try again."); setBusy(false); }
  }

  return (
    <InspectorShell
      logoSrc={logoSrc} userName={userName} onBack={back} onTab={onTab}
      footer={
        <div className="sh__bar">
          <button type="button" className="sh__save" disabled={busy} onClick={save}>
            {busy ? "Saving…" : adding ? "Add Part" : "Update"}
          </button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={addPhoto} />
          <button type="button" className="sh__cam" onClick={() => camRef.current?.click()} aria-label="Take or attach a photo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" />
            </svg>
            {form.photos.length > 0 && <span className="sh__n">{form.photos.length}</span>}
          </button>
        </div>
      }
    >
      <style>{css}</style>

      <div className="sh__top sh__rise">
        {adding ? (
          <input className="sh__name" placeholder="Part name…" value={form.name} onChange={set("name")} maxLength={80}
                 aria-label="Part name" aria-invalid={nameErr} autoFocus />
        ) : (
          <h1>{part.name}</h1>
        )}
        <span className="sh__prog">Progress <b>{done}/{parts.length}</b></span>
      </div>
      {nameErr && <p className="sh__ferr" role="alert">Enter a name for this part.</p>}

      <div className="sh__card sh__rise" style={{ "--i": 1 }}>
        {FIELDS.map(([k, label]) => (
          <div className="sh__f" key={k}>
            <label htmlFor={`sh-${k}`}>{label}</label>
            <input id={`sh-${k}`} className="sh__in" value={form[k]} onChange={set(k)} inputMode={MODE[k]}
                   autoCapitalize={k === "serial" ? "characters" : undefined} autoComplete="off" />
          </div>
        ))}
        <textarea className="sh__ta" placeholder="Type comments here…" aria-label="Comments" value={form.comments} onChange={set("comments")} />

        {form.photos.length > 0 && (
          <div className="sh__ph">
            {form.photos.map((p) => (
              <div className="sh__th" key={p.id}>
                <img src={p.url} alt={p.name || "Part photo"} />
                <button type="button" className="sh__x" aria-label="Remove photo"
                        onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((x) => x.id !== p.id) }))}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="sh__hint">A part is marked Completed when every field is filled. Enter N/A for anything that doesn't apply.</p>
        {err && <div className="sh__err" role="alert">{err}</div>}
      </div>
    </InspectorShell>
  );
}