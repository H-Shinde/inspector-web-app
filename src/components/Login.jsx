import React, { useState } from "react";
import AppShell from "./AppShell";

/**
 * Login screen.
 * Props:
 *  - email:            optional prefill
 *  - logoSrc
 *  - onSubmit:         ({ email, password }) => void | Promise  (throw an Error to show a message)
 *  - onForgotPassword: "Forgot password?" tapped
 */
const css = `
.lg__card { padding: 16px; margin-top: 20px; display: flex; flex-direction: column; gap: 16px; }
.lg__field { display: flex; flex-direction: column; gap: 8px; }
.lg__wrap { position: relative; }
.lg__input { width: 100%; height: 48px; padding: 0 14px; border: 1px solid var(--line);
  border-radius: 10px; background: var(--field); color: var(--ink);
  font: 500 15px/1 'Inter', system-ui, sans-serif; outline: none; appearance: none; }
.lg__input:focus { border-color: var(--brand); background: #fff; box-shadow: 0 0 0 3px rgba(0,85,129,.14); }
.lg__input--pw { padding-right: 48px; }
.lg__input[aria-invalid="true"] { border-color: var(--danger); }
.lg__eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px;
  appearance: none; border: 0; background: none; color: var(--muted); display: flex; align-items: center;
  justify-content: center; cursor: pointer; border-radius: 8px; }
.lg__eye:hover { color: var(--ink); }
.lg__eye:focus-visible { outline: 2px solid var(--brand); }
.lg__err { font-size: 12px; color: var(--danger); }
.lg__forgot { align-self: flex-end; margin-top: -4px; appearance: none; border: 0; background: none; padding: 4px 0;
  font: 600 13px 'Inter', system-ui, sans-serif; color: var(--brand); cursor: pointer; }
.lg__forgot:hover { text-decoration: underline; }
.lg__forgot:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
.lg__banner { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px;
  color: var(--danger); background: #fef3f2; border: 1px solid #fecdca; }
`;

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default function Login({
  email: initialEmail = "",
  logoSrc,
  onSubmit = () => {},
  onForgotPassword = () => {},
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const errors = {
    email: /^\S+@\S+\.\S+$/.test(email) ? "" : "Enter a valid email address.",
    password: password ? "" : "Enter your password.",
  };
  const show = (k) => tried && errors[k];

  async function handleSubmit(e) {
    e.preventDefault();
    setTried(true);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;
    try {
      setBusy(true);
      await onSubmit({ email: email.trim(), password });
    } catch (err) {
      setFormError(err?.message || "Couldn't log in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      tag="Inspector Login"
      logoSrc={logoSrc}
      footer={
        <button type="submit" form="login-form" className="bv__cta" disabled={busy}>
          {busy ? "Logging in…" : "Log In"}
        </button>
      }
    >
      <style>{css}</style>
      <h1 className="bv__title">Welcome back</h1>
      <p className="bv__sub">Log in with your email and password to access your inspections.</p>

      <form id="login-form" onSubmit={handleSubmit} noValidate>
        <div className="bv__card lg__card">
          <div className="lg__field">
            <label className="bv__label" htmlFor="lg-email">Email address</label>
            <input id="lg-email" type="email" autoComplete="email" inputMode="email" className="lg__input"
                   value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!show("email")} />
            {show("email") && <span className="lg__err">{errors.email}</span>}
          </div>

          <div className="lg__field">
            <label className="bv__label" htmlFor="lg-pw">Password</label>
            <div className="lg__wrap">
              <input id="lg-pw" type={showPw ? "text" : "password"} autoComplete="current-password"
                     className="lg__input lg__input--pw" value={password}
                     onChange={(e) => setPassword(e.target.value)} aria-invalid={!!show("password")} />
              <button type="button" className="lg__eye" onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}>
                {showPw ? (
                  <Svg>
                    <path d="M17.94 17.94A10.4 10.4 0 0 1 12 19.5C6.5 19.5 2.5 12 2.5 12a18.5 18.5 0 0 1 4.56-5.44M9.9 4.6A9.7 9.7 0 0 1 12 4.5c5.5 0 9.5 7.5 9.5 7.5a18.6 18.6 0 0 1-2.16 3.19M1 1l22 22" />
                    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                  </Svg>
                ) : (
                  <Svg>
                    <path d="M2.5 12S6.5 4.5 12 4.5 21.5 12 21.5 12 17.5 19.5 12 19.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </Svg>
                )}
              </button>
            </div>
            {show("password") && <span className="lg__err">{errors.password}</span>}
          </div>

          <button type="button" className="lg__forgot" onClick={onForgotPassword}>Forgot password?</button>
        </div>
        {formError && <div className="lg__banner" role="alert">{formError}</div>}
      </form>
    </AppShell>
  );
}