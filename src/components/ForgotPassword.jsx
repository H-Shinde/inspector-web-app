import React, { useState } from "react";
import AppShell from "./AppShell";

/**
 * Forgot password screen.
 * Props:
 *  - email:       optional prefill (e.g. whatever was typed on the login screen)
 *  - logoSrc
 *  - onSubmit:    ({ email }) => void | Promise  (throw an Error to show a message)
 *  - onBack:      return to login
 */
const css = `
.fp__card { padding: 16px; margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.fp__input { width: 100%; height: 48px; padding: 0 14px; border: 1px solid var(--line);
  border-radius: 10px; background: var(--field); color: var(--ink);
  font: 500 15px/1 'Inter', system-ui, sans-serif; outline: none; appearance: none; }
.fp__input:focus { border-color: var(--brand); background: #fff; box-shadow: 0 0 0 3px rgba(0,85,129,.14); }
.fp__input[aria-invalid="true"] { border-color: var(--danger); }
.fp__err { font-size: 12px; color: var(--danger); }
.fp__banner { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px;
  color: var(--danger); background: #fef3f2; border: 1px solid #fecdca; }
.fp__link { margin-top: 16px; display: block; width: 100%; text-align: center; appearance: none; border: 0; background: none;
  padding: 8px; font: 600 14px 'Inter', system-ui, sans-serif; color: var(--brand); cursor: pointer; }
.fp__link:hover { text-decoration: underline; }
.fp__link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 6px; }

.fp__badge { display: flex; justify-content: center; padding: 32px 0 28px; }
.fp__dot { width: 64px; height: 64px; border-radius: 50%; background: var(--ok); color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 12px rgba(26,169,113,.18), 0 0 0 24px rgba(26,169,113,.09);
  animation: fp-pop 480ms cubic-bezier(.2,.8,.2,1) both; }
@keyframes fp-pop { from { transform: scale(.55); opacity: 0; } to { transform: none; opacity: 1; } }
.fp__center { text-align: center; }
.fp__sub { margin: 10px auto 0; max-width: 34ch; }
.fp__sub b { color: var(--ink); font-weight: 700; overflow-wrap: anywhere; }
@media (prefers-reduced-motion: reduce) { .fp__dot { animation: none; } }
`;

export default function ForgotPassword({
  email: initialEmail = "",
  logoSrc,
  onSubmit = () => {},
  onBack = () => {},
}) {
  const [email, setEmail] = useState(initialEmail);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const emailError = /^\S+@\S+\.\S+$/.test(email) ? "" : "Enter a valid email address.";

  async function handleSubmit(e) {
    e.preventDefault();
    setTried(true);
    setFormError("");
    if (emailError) return;
    try {
      setBusy(true);
      await onSubmit({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setFormError(err?.message || "Couldn't send the reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AppShell
        tag="Check Your Email"
        logoSrc={logoSrc}
        footer={<button type="button" className="bv__cta" onClick={onBack}>Back to Log In</button>}
      >
        <style>{css}</style>
        <div className="fp__badge">
          <div className="fp__dot">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
            </svg>
          </div>
        </div>
        <h1 className="bv__title fp__center">Check your email</h1>
        <p className="bv__sub fp__center fp__sub">
          If an account exists for <b>{email.trim()}</b>, we've sent a link to reset your password.
        </p>
        <button type="button" className="fp__link" onClick={() => setSent(false)}>
          Didn't get it? Try a different email
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell
      tag="Reset Password"
      logoSrc={logoSrc}
      footer={
        <button type="submit" form="forgot-form" className="bv__cta" disabled={busy}>
          {busy ? "Sending…" : "Send Reset Link"}
        </button>
      }
    >
      <style>{css}</style>
      <h1 className="bv__title">Forgot password?</h1>
      <p className="bv__sub">
        Enter the email address for your account and we'll send you a link to reset your password.
      </p>

      <form id="forgot-form" onSubmit={handleSubmit} noValidate>
        <div className="bv__card fp__card">
          <label className="bv__label" htmlFor="fp-email">Email address</label>
          <input id="fp-email" type="email" autoComplete="email" inputMode="email" className="fp__input"
                 value={email} onChange={(e) => setEmail(e.target.value)}
                 aria-invalid={tried && !!emailError} autoFocus />
          {tried && emailError && <span className="fp__err">{emailError}</span>}
        </div>
        {formError && <div className="fp__banner" role="alert">{formError}</div>}
      </form>

      <button type="button" className="fp__link" onClick={onBack}>Back to Log In</button>
    </AppShell>
  );
}