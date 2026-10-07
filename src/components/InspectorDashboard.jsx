import React from "react";
import InspectorShell from "./InspectorShell";

/**
 * Screen 4 — Inspector dashboard.
 * Props:
 *  - jobs:       [{ id, title, address, status: "new" | "in-progress" | "submitted" }]
 *  - userName, logoSrc
 *  - onOpenJob:  (job) => void   (tapping a New job opens the client popup)
 *  - onOpenCurrent: (job) => void (tapping a Current job opens its part list)
 *  - tab, onTab: bottom nav state
 */
const css = `
.db { --i: 0; }
.db__rise { animation: db-rise 520ms cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i) * 70ms); }
@keyframes db-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes db-pop  { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
@keyframes db-ping { 0% { transform: scale(1); opacity: .55; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
@keyframes db-sheen { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* greeting */
.db__hello { font-size: 14px; color: var(--muted); font-weight: 500; }
.db__name { margin-top: 2px; font-size: 28px; line-height: 1.15; font-weight: 700; letter-spacing: -0.03em; }

/* stats */
.db__stats { margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.db__stat { position: relative; overflow: hidden; padding: 14px 14px 12px; border-radius: 16px; background: #fff;
  border: 1px solid var(--line); box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.db__stat-n { display: block; font-size: 26px; line-height: 1; font-weight: 700; letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums; animation: db-pop 420ms cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i) * 70ms + 180ms); }
.db__stat-l { display: block; margin-top: 6px; font-size: 12px; font-weight: 500; color: var(--muted); }
.db__stat--hero { background: linear-gradient(135deg, #006a9e 0%, var(--brand) 55%, #00405f 100%); border-color: transparent;
  color: #fff; box-shadow: 0 8px 20px -8px rgba(0,85,129,.55); }
.db__stat--hero .db__stat-l { color: rgba(255,255,255,.78); }

/* sections */
.db__sec { margin-top: 30px; }
.db__h { display: flex; align-items: center; gap: 8px; }
.db__h h1 { font-size: 18px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; }
.db__chip { min-width: 22px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--brand-tint); color: var(--brand);
  font-size: 12px; font-weight: 700; line-height: 22px; text-align: center; }
.db__list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }

/* job card */
.db__job { position: relative; display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 14px;
  width: 100%; appearance: none; text-align: left; padding: 14px; border: 1px solid var(--line); border-radius: 16px;
  background: #fff; color: var(--ink); font: inherit; box-shadow: 0 1px 2px rgba(15,23,42,.04); cursor: default;
  -webkit-tap-highlight-color: transparent; }
button.db__job { cursor: pointer; transition: transform 160ms ease, box-shadow 200ms ease, border-color 200ms ease; }
button.db__job:hover { transform: translateY(-2px); border-color: #c9dde8; box-shadow: 0 12px 24px -12px rgba(0,85,129,.35); }
button.db__job:active { transform: scale(.98); box-shadow: 0 1px 2px rgba(15,23,42,.04); }
button.db__job:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
.db__ico { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: var(--brand-tint); color: var(--brand); position: relative; }
.db__job--new .db__ico { background: linear-gradient(135deg, #006a9e, var(--brand)); color: #fff; }
.db__dot { position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; border-radius: 50%; background: #1d7de0; border: 2px solid #fff; }
.db__dot::after { content: ""; position: absolute; inset: -2px; border-radius: 50%; background: #1d7de0; animation: db-ping 1.8s ease-out infinite; z-index: -1; }
.db__txt { min-width: 0; }
.db__t { display: block; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.db__a { margin-top: 3px; display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); min-width: 0; }
.db__a span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.db__a svg { flex: none; }
.db__chev { color: #9aa7b4; transition: transform 200ms ease, color 200ms ease; display: flex; }
button.db__job:hover .db__chev { transform: translateX(3px); color: var(--brand); }

.db__pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px 5px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 600; line-height: 1; white-space: nowrap; }
.db__pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.db__pill--progress { background: #fff4d6; color: #9a6200; }
.db__pill--progress::before { animation: db-ping 1.8s ease-out infinite; box-shadow: 0 0 0 0 currentColor; }
.db__pill--submitted { background: #dff5ea; color: #0e6b47; }

.db__empty { margin-top: 12px; padding: 24px 16px; border: 1.5px dashed #d3dbe3; border-radius: 16px; text-align: center;
  font-size: 14px; line-height: 1.5; color: var(--muted); }

@media (prefers-reduced-motion: reduce) {
  .db__rise, .db__stat-n, .db__dot::after, .db__pill--progress::before { animation: none; }
  button.db__job, .db__chev { transition: none; }
  button.db__job:hover { transform: none; }
}
`;

const Svg = ({ children, size = 20, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const STATUS = {
  "in-progress": { label: "In progress", cls: "db__pill--progress" },
  submitted: { label: "Submitted", cls: "db__pill--submitted" },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function JobCard({ job, index, onOpen }) {
  const status = STATUS[job.status];
  const isNew = job.status === "new";
  const body = (
    <>
      <span className="db__ico">
        <Svg>
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
        </Svg>
        {isNew && <span className="db__dot" />}
      </span>
      <span className="db__txt">
        <span className="db__t">{job.title}</span>
        <span className="db__a">
          <Svg size={13} sw={2}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.3" /></Svg>
          <span>{job.address}</span>
        </span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {status && <span className={`db__pill ${status.cls}`}>{status.label}</span>}
        {onOpen && <span className="db__chev"><Svg><path d="m9 6 6 6-6 6" /></Svg></span>}
      </span>
    </>
  );
  const cls = `db__job db__rise ${isNew ? "db__job--new" : ""}`;
  const style = { "--i": index };
  return (
    <li>
      {onOpen ? (
        <button type="button" className={cls} style={style} onClick={() => onOpen(job)}>{body}</button>
      ) : (
        <div className={cls} style={style}>{body}</div>
      )}
    </li>
  );
}

function Section({ title, jobs, empty, onOpen, offset }) {
  return (
    <section className="db__sec" aria-label={title}>
      <div className="db__h db__rise" style={{ "--i": offset }}>
        <h1>{title}</h1>
        {jobs.length > 0 && <span className="db__chip">{jobs.length}</span>}
      </div>
      {jobs.length ? (
        <ul className="db__list">
          {jobs.map((j, i) => <JobCard key={j.id} job={j} index={offset + 1 + i} onOpen={onOpen} />)}
        </ul>
      ) : (
        <p className="db__empty db__rise" style={{ "--i": offset + 1 }}>{empty}</p>
      )}
    </section>
  );
}

export default function InspectorDashboard({
  jobs = [],
  userName = "",
  logoSrc,
  tab = "jobs",
  onTab,
  onOpenJob = () => {},
  onOpenCurrent = () => {},
}) {
  const fresh = jobs.filter((j) => j.status === "new");
  const active = jobs.filter((j) => j.status === "in-progress");
  const done = jobs.filter((j) => j.status === "submitted");
  const current = [...active, ...done];
  const first = userName.split(" ")[0];

  const stats = [
    { n: fresh.length, l: "New", hero: true },
    { n: active.length, l: "In progress" },
    { n: done.length, l: "Submitted" },
  ];

  return (
    <InspectorShell logoSrc={logoSrc} tab={tab} onTab={onTab} userName={userName}>
      <style>{css}</style>
      <div className="db">
        <p className="db__hello db__rise" style={{ "--i": 0 }}>{greeting()}</p>
        <h1 className="db__name db__rise" style={{ "--i": 1 }}>{first || "Inspector"}</h1>

        <div className="db__stats">
          {stats.map((s, i) => (
            <div key={s.l} className={`db__stat db__rise ${s.hero ? "db__stat--hero" : ""}`} style={{ "--i": i + 2 }}>
              <span className="db__stat-n" style={{ "--i": i + 2 }}>{s.n}</span>
              <span className="db__stat-l">{s.l}</span>
            </div>
          ))}
        </div>

        <Section title="New jobs" jobs={fresh} onOpen={onOpenJob} offset={5}
                 empty="No new requests. They'll show up here when an administrator assigns one." />
        <Section title="Current jobs" jobs={current} onOpen={onOpenCurrent} offset={5 + Math.max(fresh.length, 1) + 1}
                 empty="Nothing in progress. Accept a new request to get started." />
      </div>
    </InspectorShell>
  );
}