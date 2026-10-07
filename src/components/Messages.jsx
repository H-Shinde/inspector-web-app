import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import InspectorShell from "./InspectorShell";

/**
 * Screen 6 — Messages. A single thread between the inspector and the admin.
 * There is intentionally no recipient picker: the only person an inspector can message is the admin.
 *
 * Props:
 *  - messages: [{ id, from: "inspector" | "admin", text, createdAt (ISO string),
 *                 attachments?: [{ id, type: "image" | "video", url, name }] }]  (oldest first)
 *  - onSend:   (text, files: File[]) => Promise — upload/persist; throw to mark it failed (user can retry)
 *  - adminName, userName, logoSrc, tab, onTab
 */
const MAX = 2000;
const MAX_FILES = 5;
const MAX_MB = 25;

const css = `
.ms__head { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 12px;
  padding: 12px 20px; background: rgba(255,255,255,.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line); }
.ms__av { width: 40px; height: 40px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #006a9e, var(--brand)); color: #fff; }
.ms__who { min-width: 0; }
.ms__who b { display: block; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
.ms__who span { display: block; font-size: 12px; color: var(--muted); margin-top: 1px; }

.ms__list { flex: 1; list-style: none; margin: 0; padding: 16px 16px 8px; display: flex; flex-direction: column; gap: 3px; }
.ms__day { align-self: center; margin: 14px 0 8px; padding: 4px 10px; border-radius: 999px; background: #e9eef3;
  font-size: 11px; font-weight: 600; color: var(--muted); }
.ms__row { display: flex; flex-direction: column; max-width: 80%; animation: ms-in 260ms cubic-bezier(.2,.8,.2,1) both; }
.ms__row--me { align-self: flex-end; align-items: flex-end; transform-origin: bottom right; }
.ms__row--admin { align-self: flex-start; align-items: flex-start; transform-origin: bottom left; }
.ms__row--end { margin-bottom: 8px; }
.ms__b { padding: 9px 14px; font-size: 14.5px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
.ms__row--me .ms__b { background: linear-gradient(135deg, #006a9e, var(--brand)); color: #fff; border-radius: 18px 18px 5px 18px; }
.ms__row--admin .ms__b { background: #fff; color: var(--ink); border: 1px solid var(--line); border-radius: 18px 18px 18px 5px;
  box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.ms__row--me:not(.ms__row--end) .ms__b { border-bottom-right-radius: 18px; }
.ms__row--admin:not(.ms__row--end) .ms__b { border-bottom-left-radius: 18px; }
.ms__row--wait .ms__b { opacity: .65; }
.ms__meta { margin-top: 4px; font-size: 11px; color: var(--muted); }
.ms__fail { margin-top: 4px; display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--danger); font-weight: 600; }
.ms__retry { appearance: none; border: 0; background: none; padding: 0; font: inherit; color: var(--brand); text-decoration: underline; cursor: pointer; }

.ms__empty { margin: auto; padding: 24px; text-align: center; max-width: 260px; animation: ms-in 400ms ease both; }
.ms__empty-i { width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 18px; background: var(--brand-tint); color: var(--brand);
  display: flex; align-items: center; justify-content: center; }
.ms__empty b { display: block; font-size: 16px; font-weight: 700; }
.ms__empty p { margin-top: 6px; font-size: 13.5px; line-height: 1.5; color: var(--muted); }

.ms__comp { display: flex; align-items: flex-end; gap: 4px; padding: 6px 6px 6px 6px; border: 1px solid var(--line);
  border-radius: 24px; background: #fff; box-shadow: 0 6px 20px -10px rgba(15,23,42,.25); transition: border-color 160ms ease, box-shadow 160ms ease; }
.ms__comp:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(0,85,129,.14); }
.ms__ta { flex: 1; min-width: 0; resize: none; border: 0; outline: none; background: none; color: var(--ink);
  font: 400 15px/1.4 'Inter', system-ui, sans-serif; padding: 9px 0; max-height: 120px; }
.ms__ta::placeholder { color: #94a3b8; }
.ms__send { flex: none; width: 40px; height: 40px; appearance: none; border: 0; border-radius: 50%; background: var(--brand); color: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 140ms ease, opacity 140ms ease, background-color 140ms ease; }
.ms__send:hover { background: var(--brand-press); }
.ms__send:active { transform: scale(.9); }
.ms__send:disabled { opacity: .35; cursor: default; transform: none; }
.ms__send:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.ms__count { margin: 4px 14px 0; text-align: right; font-size: 11px; color: var(--danger); }

.ms__attach { flex: none; width: 40px; height: 40px; appearance: none; border: 0; border-radius: 50%; background: none; color: var(--muted);
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 140ms ease, color 140ms ease, transform 140ms ease; }
.ms__attach:hover { background: var(--brand-tint); color: var(--brand); }
.ms__attach:active { transform: scale(.9); }
.ms__attach:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.ms__prev { display: flex; gap: 8px; padding: 0 4px 10px; overflow-x: auto; }
.ms__thumb { position: relative; flex: none; width: 64px; height: 64px; border-radius: 12px; overflow: hidden; background: #e9eef3;
  border: 1px solid var(--line); animation: ms-in 220ms cubic-bezier(.2,.8,.2,1) both; }
.ms__thumb img, .ms__thumb video { width: 100%; height: 100%; object-fit: cover; display: block; }
.ms__play { position: absolute; left: 5px; bottom: 5px; width: 18px; height: 18px; border-radius: 50%; background: rgba(15,23,42,.65); color: #fff; display: flex; align-items: center; justify-content: center; }
.ms__x { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; appearance: none; border: 0; border-radius: 50%; padding: 0;
  background: rgba(15,23,42,.7); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.ms__x:focus-visible { outline: 2px solid #fff; }
.ms__media { display: grid; gap: 3px; grid-template-columns: repeat(2, 1fr); width: min(260px, 68vw); margin-bottom: 3px; }
.ms__media--1 { grid-template-columns: 1fr; }
.ms__m { position: relative; border-radius: 14px; overflow: hidden; background: #e9eef3; aspect-ratio: 1; border: 0; padding: 0; display: block; cursor: zoom-in; }
.ms__media--1 .ms__m { aspect-ratio: 4 / 3; }
.ms__m img, .ms__m video { width: 100%; height: 100%; object-fit: cover; display: block; }
.ms__m--vid { cursor: default; }
.ms__row--wait .ms__media { opacity: .65; }
.ms__err { margin: 0 14px 8px; font-size: 12px; color: var(--danger); }
.ms__lb { position: fixed; inset: 0; z-index: 10; background: rgba(8,12,20,.92); display: flex; align-items: center; justify-content: center;
  padding: 24px; animation: ms-fade 180ms ease both; }
.ms__lb img { max-width: 100%; max-height: 100%; border-radius: 8px; }
.ms__lb-x { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); right: 12px; width: 40px; height: 40px; appearance: none; border: 0; border-radius: 50%;
  background: rgba(255,255,255,.14); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
@keyframes ms-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ms-in { from { opacity: 0; transform: translateY(8px) scale(.96); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .ms__row, .ms__empty, .ms__thumb, .ms__lb { animation: none; } .ms__send, .ms__comp { transition: none; } }
`;

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayKey = (d) => d.toDateString();
function dayLabel(d) {
  const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return "Today";
  if (dayKey(d) === dayKey(y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export default function Messages({
  messages = [],
  onSend = async () => {},
  adminName = "Colin Size",
  userName,
  logoSrc,
  tab = "messages",
  onTab,
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState([]); // [{ id, text, createdAt, failed }]
  const [files, setFiles] = useState([]); // [{ id, file, url, type }]
  const [fileErr, setFileErr] = useState("");
  const [viewer, setViewer] = useState(null);
  const fileRef = useRef(null);
  const taRef = useRef(null);
  const endRef = useRef(null);

  const all = [
    ...messages.map((m) => ({ ...m, wait: false })),
    ...pending.map((p) => ({ id: p.id, from: "inspector", text: p.text, attachments: p.attachments, createdAt: p.createdAt, wait: !p.failed, failed: p.failed })),
  ];

  // keep the newest message in view
  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [all.length]);

  // auto-grow the textarea
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [draft]);

  async function deliver(item) {
    try {
      await onSend(item.text, item.files.map((f) => f.file));
      setPending((ps) => ps.filter((p) => p.id !== item.id));
      item.files.forEach((f) => URL.revokeObjectURL(f.url));
    } catch {
      setPending((ps) => ps.map((p) => (p.id === item.id ? { ...p, failed: true } : p)));
    }
  }

  function send() {
    const text = draft.trim();
    if ((!text && !files.length) || text.length > MAX) return;
    const item = {
      id: `tmp-${Date.now()}`, text, files, createdAt: new Date().toISOString(), failed: false,
      attachments: files.map((f) => ({ id: f.id, type: f.type, url: f.url, name: f.file.name })),
    };
    setPending((ps) => [...ps, item]);
    setDraft("");
    setFiles([]);
    setFileErr("");
    deliver(item);
  }

  function retry(id) {
    const item = pending.find((p) => p.id === id);
    if (!item) return;
    setPending((ps) => ps.map((p) => (p.id === id ? { ...p, failed: false } : p)));
    deliver(item);
  }

  function pickFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    let msg = "";
    const next = [...files];
    for (const file of picked) {
      const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
      if (!type) { msg = "Only images and videos can be attached."; continue; }
      if (file.size > MAX_MB * 1024 * 1024) { msg = `${file.name} is over ${MAX_MB} MB.`; continue; }
      if (next.length >= MAX_FILES) { msg = `You can attach up to ${MAX_FILES} files per message.`; break; }
      next.push({ id: `f-${Date.now()}-${next.length}`, file, url: URL.createObjectURL(file), type });
    }
    setFiles(next);
    setFileErr(msg);
  }

  function removeFile(id) {
    setFiles((fs) => {
      fs.filter((f) => f.id === id).forEach((f) => URL.revokeObjectURL(f.url));
      return fs.filter((f) => f.id !== id);
    });
    setFileErr("");
  }

  useEffect(() => {
    if (!viewer) return;
    const h = (e) => e.key === "Escape" && setViewer(null);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [viewer]);

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  let lastDay = "";
  const items = all.map((m, i) => {
    const d = new Date(m.createdAt);
    const k = dayKey(d);
    const showDay = k !== lastDay;
    lastDay = k;
    const next = all[i + 1];
    const end = !next || next.from !== m.from || new Date(next.createdAt) - d > 5 * 60 * 1000 || dayKey(new Date(next.createdAt)) !== k;
    return { m, d, showDay, end };
  });

  const tooLong = draft.length > MAX;

  return (
    <InspectorShell
      chat
      logoSrc={logoSrc}
      tab={tab}
      onTab={onTab}
      userName={userName}
      footer={
        <>
          {files.length > 0 && (
            <div className="ms__prev" aria-label="Attachments to send">
              {files.map((f) => (
                <div className="ms__thumb" key={f.id}>
                  {f.type === "image" ? <img src={f.url} alt={f.file.name} /> : <><video src={`${f.url}#t=0.1`} muted playsInline preload="metadata" /><span className="ms__play"><Svg size={10}><path d="m8 5 11 7-11 7z" fill="currentColor" /></Svg></span></>}
                  <button type="button" className="ms__x" onClick={() => removeFile(f.id)} aria-label={`Remove ${f.file.name}`}><Svg size={12}><path d="M6 6l12 12M18 6 6 18" /></Svg></button>
                </div>
              ))}
            </div>
          )}
          {fileErr && <p className="ms__err" role="alert">{fileErr}</p>}
          <div className="ms__comp">
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={pickFiles} />
            <button type="button" className="ms__attach" onClick={() => fileRef.current?.click()} aria-label="Attach photo or video"
                    disabled={files.length >= MAX_FILES}>
              <Svg><path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" /></Svg>
            </button>
            <textarea ref={taRef} className="ms__ta" rows={1} value={draft} placeholder={files.length ? "Add a caption…" : `Message ${adminName.split(" ")[0]}…`}
                      aria-label="Message to admin" onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} />
            <button type="button" className="ms__send" onClick={send} disabled={(!draft.trim() && !files.length) || tooLong} aria-label="Send message">
              <Svg><path d="M12 19V5M5 12l7-7 7 7" /></Svg>
            </button>
          </div>
          {tooLong && <p className="ms__count" role="alert">{draft.length}/{MAX} — message is too long</p>}
        </>
      }
    >
      <style>{css}</style>
      <div className="ms__head">
        <span className="ms__av" style={{ fontSize: 14, fontWeight: 700 }}>{adminName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
        <div className="ms__who">
          <b>{adminName}</b>
          <span>Admin · Bison Valuation</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="ms__empty">
          <div className="ms__empty-i"><Svg size={26}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Svg></div>
          <b>No messages yet</b>
          <p>Questions about a job or your account? Send a note and the admin will reply here.</p>
        </div>
      ) : (
        <ul className="ms__list" aria-live="polite">
          {items.map(({ m, d, showDay, end }) => (
            <React.Fragment key={m.id}>
              {showDay && <li className="ms__day">{dayLabel(d)}</li>}
              <li className={`ms__row ms__row--${m.from === "admin" ? "admin" : "me"} ${end ? "ms__row--end" : ""} ${m.wait ? "ms__row--wait" : ""}`}>
                {m.attachments?.length > 0 && (
                  <div className={`ms__media ms__media--${Math.min(m.attachments.length, 2)}`}>
                    {m.attachments.map((a) =>
                      a.type === "video" ? (
                        <div className="ms__m ms__m--vid" key={a.id}><video src={a.url} controls playsInline preload="metadata" /></div>
                      ) : (
                        <button type="button" className="ms__m" key={a.id} onClick={() => setViewer(a)} aria-label={`View ${a.name || "image"}`}>
                          <img src={a.url} alt={a.name || "Attached image"} loading="lazy" />
                        </button>
                      )
                    )}
                  </div>
                )}
                {m.text && <div className="ms__b">{m.text}</div>}
                {m.failed ? (
                  <div className="ms__fail">Not sent <button type="button" className="ms__retry" onClick={() => retry(m.id)}>Retry</button></div>
                ) : (
                  end && <div className="ms__meta">{m.wait ? "Sending…" : timeFmt.format(d)}</div>
                )}
              </li>
            </React.Fragment>
          ))}
        </ul>
      )}
      <div ref={endRef} />
      {viewer && (
        <div className="ms__lb" role="dialog" aria-label="Image preview" onClick={() => setViewer(null)}>
          <button type="button" className="ms__lb-x" aria-label="Close" onClick={() => setViewer(null)}><Svg><path d="M6 6l12 12M18 6 6 18" /></Svg></button>
          <img src={viewer.url} alt={viewer.name || "Attached image"} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </InspectorShell>
  );
}