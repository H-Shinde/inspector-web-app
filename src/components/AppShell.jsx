import React, { useState } from "react";

/**
 * Shared frame for screens 2 and 3: app bar + scrolling body + pinned footer.
 * Props: tag (pill text in the bar), logoSrc, footer (node), children.
 */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600&family=Inter:wght@400;500;600;700&display=swap');

.bv {
  --brand: #005581; --brand-press: #00456a; --brand-tint: #e8f1f6;
  --ink: #0f172a; --muted: #5b6b7b; --line: #e5e9ee; --field: #f5f7fa;
  --danger: #b42318; --ok: #1aa971;
  all: initial;
  display: flex; flex-direction: column; min-height: 100dvh; width: 100%;
  background: #fff; color: var(--ink); color-scheme: light; text-align: left;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased; box-sizing: border-box;
}
.bv *, .bv *::before, .bv *::after { box-sizing: border-box; }
.bv h1, .bv h2, .bv p { margin: 0; }

.bv__bar { position: sticky; top: 0; z-index: 2; background: #fff;
  border-bottom: 1px solid var(--line); padding-top: env(safe-area-inset-top, 0px); }
.bv__bar-in { max-width: 480px; margin: 0 auto; height: 56px; padding: 0 20px;
  display: flex; align-items: center; gap: 10px; }
.bv__logo { height: 28px; width: auto; flex: none; }
.bv__brand { flex: 1; min-width: 0; font-family: 'Source Serif 4', Georgia, serif;
  font-weight: 600; font-size: 18px; letter-spacing: -0.01em; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bv__tag { flex: none; background: var(--brand-tint); color: var(--brand);
  font-size: 12px; font-weight: 600; line-height: 1; padding: 7px 10px; border-radius: 6px; }

.bv__main { flex: 1; width: 100%; max-width: 480px; margin: 0 auto; padding: 24px 20px 16px; }
.bv__foot { position: sticky; bottom: 0; background: #fff; }
.bv__foot-in { max-width: 480px; margin: 0 auto;
  padding: 12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px); }

.bv__title { font-size: 24px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; color: var(--ink); }
.bv__sub { margin-top: 8px; font-size: 14px; line-height: 1.55; color: var(--muted); }

.bv__card { border: 1px solid var(--line); border-radius: 14px; background: #fff; }
.bv__label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

.bv__cta { appearance: none; width: 100%; height: 52px; padding: 0; border: 0; border-radius: 12px;
  background: var(--brand); color: #fff; font-family: inherit; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: background-color 120ms ease, transform 120ms ease;
  -webkit-tap-highlight-color: transparent; }
.bv__cta:hover, .bv__cta:active { background: var(--brand-press); }
.bv__cta:active { transform: scale(0.99); }
.bv__cta:disabled { opacity: .6; cursor: default; transform: none; }
.bv__cta:focus-visible { outline: 3px solid rgba(0,85,129,.35); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .bv__cta { transition: none; } }
`;

export default function AppShell({ tag, logoSrc = "/logo.png", footer, children }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <style>{CSS}</style>
      <div className="bv">
        <header className="bv__bar">
          <div className="bv__bar-in">
            {!failed && (
              <img className="bv__logo" src={logoSrc} alt="" aria-hidden="true"
                   onError={() => setFailed(true)} />
            )}
            <h2 className="bv__brand">Bison Valuation</h2>
            <span className="bv__tag">{tag}</span>
          </div>
        </header>
        <main className="bv__main">{children}</main>
        {footer && <footer className="bv__foot"><div className="bv__foot-in">{footer}</div></footer>}
      </div>
    </>
  );
}