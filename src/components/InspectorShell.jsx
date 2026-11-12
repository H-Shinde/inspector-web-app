import { UpdateBadge } from '../updates';
import React, { useEffect, useRef, useState } from "react";

/**
 * Frame for the signed-in inspector screens: app bar (+ optional back button),
 * scrolling body, optional footer, and a bottom tab bar.
 * Props: logoSrc, onBack, tab ("jobs" | "messages" | "profile"), onTab, userName, footer, children.
 */
const CSS = `
.ix {
  --brand: #005581; --brand-press: #00456a; --brand-tint: #e8f1f6;
  --ink: #0f172a; --muted: #5b6b7b; --line: #e5e9ee; --field: #f5f7fa;
  --danger: #b42318; --ok: #1aa971; --page: #f7f8fa;
  all: initial;
  display: flex; flex-direction: column; height: 100dvh; min-height: 0; width: 100%; overflow: hidden;
  background: var(--page); color: var(--ink); color-scheme: light; text-align: left;
  font-family: var(--font-family-ui);
  -webkit-font-smoothing: antialiased; box-sizing: border-box;
}
.ix *, .ix *::before, .ix *::after { box-sizing: border-box; }
.ix h1, .ix h2, .ix h3, .ix p { margin: 0; }
.ix h1, .ix h3 { color: var(--ink); font-family: inherit; }
.ix button { font-family: inherit; }

.ix__bar { flex: none; position: sticky; top: 0; z-index: 2; background: #fff;
  border-bottom: 1px solid var(--line); padding-top: env(safe-area-inset-top, 0px); }
.ix__bar-in { position: relative; max-width: 480px; margin: 0 auto; height: 56px; padding: 0 20px;
  display: flex; align-items: center; justify-content: center; gap: 10px; }
.ix__logo { height: 28px; width: auto; flex: none; }
.ix__brand { font-family: var(--font-family-ui); font-weight: 600; font-size: 18px;
  letter-spacing: -0.01em; color: var(--ink); white-space: nowrap; }
.ix__back { position: absolute; left: 8px; top: 8px; width: 40px; height: 40px; appearance: none;
  border: 0; background: none; color: var(--ink); display: flex; align-items: center;
  justify-content: center; border-radius: 10px; cursor: pointer; }
.ix__back:hover { background: var(--field); }
.ix__back:focus-visible, .ix__tab:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.ix__main { flex: 1; min-height: 0; width: 100%; max-width: 480px; margin: 0 auto; padding: 24px 20px 20px;
  overflow-y: scroll; scrollbar-gutter: stable; scrollbar-width: auto; scrollbar-color: #66869a #e8eef3;
  overscroll-behavior-y: contain; }
.ix__main::-webkit-scrollbar { width: 12px; }
.ix__main::-webkit-scrollbar-track { background: #e8eef3; border-radius: 8px; }
.ix__main::-webkit-scrollbar-thumb { background: #66869a; border: 3px solid #e8eef3; border-radius: 8px; min-height: 40px; }
.ix__main::-webkit-scrollbar-thumb:hover { background: #005581; }
.ix__more { flex: none; align-self: center; display: flex; align-items: center; justify-content: center; gap: 6px;
  margin: 0; padding: 7px 18px; border: 1px solid #b8d0df; border-radius: 20px; background: #e8f1f6;
  color: #005581; font: 600 13px var(--font-family-ui); cursor: pointer; box-shadow: 0 -6px 18px #f7f8fa; }
.ix__more:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.ix__main:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; }
.ix--chat { height: 100dvh; min-height: 0; }
.ix--chat .ix__main { padding: 0; display: flex; flex-direction: column; overflow-y: scroll; min-height: 0; overscroll-behavior: contain; }
.ix--chat .ix__foot { flex: none; }
.ix__foot { flex: none; width: 100%; max-width: 480px; margin: 0 auto; padding: 8px 20px 16px; }

.ix__title { font-size: 24px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; }
.ix__card { border: 1px solid var(--line); border-radius: 14px; background: #fff; }

.ix__nav { flex: none; position: sticky; bottom: 0; z-index: 2; background: #fff; border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom, 0px); }
.ix__nav-in { max-width: 480px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); padding-right: min(120px, 25vw); }
.ix__tab { appearance: none; border: 0; background: none; padding: 8px 4px 10px; display: flex;
  flex-direction: column; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
  color: var(--muted); cursor: pointer; -webkit-tap-highlight-color: transparent; min-width: 0; }
.ix__tab-ico { width: 56px; height: 32px; border-radius: 16px; display: flex; align-items: center;
  justify-content: center; transition: background-color 120ms ease; }
.ix__tab[aria-current="page"] { color: var(--brand); }
.ix__tab[aria-current="page"] .ix__tab-ico { background: var(--brand-tint); animation: ix-pill 260ms cubic-bezier(.2,.8,.2,1); }
.ix__tab:active .ix__tab-ico { transform: scale(.94); }
@keyframes ix-pill { from { transform: scaleX(.6); opacity: .4; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ix__tab[aria-current="page"] .ix__tab-ico { animation: none; } }
.ix__tab-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .ix__tab-ico { transition: none; } }
`;

const Svg = ({ children, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const ICONS = {
  jobs: (
    <Svg>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </Svg>
  ),
  messages: <Svg><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Svg>,
  profile: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>,
};

export default function InspectorShell({
  logoSrc = "/logo.png",
  onBack,
  tab = "jobs",
  onTab = () => {},
  userName = "Profile",
  chat = false,
  footer,
  children,
}) {
  const [failed, setFailed] = useState(false);
  const mainRef = useRef(null);
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    const main = mainRef.current;
    const update = () => setMoreBelow(main.scrollHeight - main.clientHeight - main.scrollTop > 12);
    main.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(main);
    Array.from(main.children).forEach(child => observer.observe(child));
    update();
    return () => { main.removeEventListener('scroll', update); observer.disconnect(); };
  }, [children]);
  const tabs = [
    { id: "jobs", label: "Jobs" },
    { id: "messages", label: "Messages" },
    { id: "profile", label: userName.includes("@") ? userName.split("@")[0] : userName },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className={chat ? "ix ix--chat" : "ix"}>
        <header className="ix__bar">
          <div className="ix__bar-in">
            {onBack && (
              <button type="button" className="ix__back" onClick={onBack} aria-label="Back">
                <Svg size={24}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>
              </button>
            )}
            {!failed && (
              <img className="ix__logo" src={logoSrc} alt="" aria-hidden="true"
                   onError={() => setFailed(true)} />
            )}
            <h2 className="ix__brand">Bison Valuation</h2>
          </div>
        </header>

        <main ref={mainRef} className="ix__main" tabIndex={0} aria-label="Screen content">{children}</main>
        {moreBelow && !chat && <button type="button" className="ix__more" onClick={() => mainRef.current?.scrollBy({ top: mainRef.current.clientHeight * 0.7, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
          More below <Svg size={16}><path d="M12 4v16M6 14l6 6 6-6" /></Svg>
        </button>}
        {footer && <div className="ix__foot">{footer}</div>}

        <nav className="ix__nav" aria-label="Primary">
          <div className="ix__nav-in">
            {tabs.map((t) => (
              <button key={t.id} type="button" className="ix__tab"
                      aria-current={tab === t.id ? "page" : undefined}
                      onClick={() => onTab(t.id)}>
                <span className="ix__tab-ico">{ICONS[t.id]}</span>
                <span className="ix__tab-label">{t.label}<UpdateBadge kind={t.id === "messages" ? "message" : t.id === "jobs" ? "job" : "profile"} /></span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}