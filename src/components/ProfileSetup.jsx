import React, { useState } from "react";
import AppShell from "./AppShell";

/**
 * Screen 2 — Complete Profile Setup.
 * Props:
 *  - fullName:     prefilled from the invite, editable
 *  - email:        prefilled from the invite, editable
 *  - onSubmit:     ({ fullName, email, password }) => void | Promise  (throw to show an error)
 *  - onViewTerms:  called when the document icon is tapped
 */
const css = `
.ps__card { padding: 16px; margin-top: 20px; display: flex; flex-direction: column; gap: 16px; }
.ps__field { display: flex; flex-direction: column; gap: 8px; }
.ps__wrap { position: relative; }
.ps__input { width: 100%; height: 48px; padding: 0 14px; border: 1px solid var(--line);
  border-radius: 10px; background: var(--field); color: var(--ink);
  font: 500 15px/1 'Inter', system-ui, sans-serif; outline: none; appearance: none; }
.ps__input:focus { border-color: var(--brand); background: #fff; box-shadow: 0 0 0 3px rgba(0,85,129,.14); }
.ps__input--pw { padding-right: 48px; }
.ps__eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px;
  appearance: none; border: 0; background: none; color: var(--muted); display: flex; align-items: center;
  justify-content: center; cursor: pointer; border-radius: 8px; }
.ps__eye:hover { color: var(--ink); }
.ps__eye:focus-visible { outline: 2px solid var(--brand); }
.ps__input[aria-invalid="true"] { border-color: var(--danger); }
.ps__hr { height: 1px; background: var(--line); margin: 0 -16px; }
.ps__err { font-size: 12px; color: var(--danger); }
.ps__terms { display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 1px solid var(--line); border-radius: 10px; background: var(--field); }
.ps__terms label { flex: 1; display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.ps__terms input { width: 18px; height: 18px; margin: 0; accent-color: var(--brand); }
.ps__doc { appearance: none; border: 0; background: none; padding: 4px; color: var(--muted); display: flex; cursor: pointer; }
.ps__banner { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px;
  color: var(--danger); background: #fef3f2; border: 1px solid #fecdca; }
`;

const Svg = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const EyeToggle = ({ shown, onToggle }) => (
  <button type="button" className="ps__eye" onClick={onToggle}
          aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
    {shown ? (
      <Svg size={20}>
        <path d="M17.94 17.94A10.4 10.4 0 0 1 12 19.5C6.5 19.5 2.5 12 2.5 12a18.5 18.5 0 0 1 4.56-5.44M9.9 4.6A9.7 9.7 0 0 1 12 4.5c5.5 0 9.5 7.5 9.5 7.5a18.6 18.6 0 0 1-2.16 3.19M1 1l22 22" />
        <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      </Svg>
    ) : (
      <Svg size={20}>
        <path d="M2.5 12S6.5 4.5 12 4.5 21.5 12 21.5 12 17.5 19.5 12 19.5 2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="3" />
      </Svg>
    )}
  </button>
);

export default function ProfileSetup({
  fullName: initialName = "",
  email: initialEmail = "",
  logoSrc,
  onSubmit = () => {},
  onViewTerms = () => {},
}) {
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const errors = {
    name: fullName.trim() ? "" : "Enter your full name.",
    email: /^\S+@\S+\.\S+$/.test(email) ? "" : "Enter a valid email address.",
    password: password ? "" : "Enter a password.",
    confirm: confirm && confirm === password ? "" : "Passwords do not match.",
    terms: agreed ? "" : "You must accept the Terms & Conditions.",
  };
  const show = (k) => tried && errors[k];

  async function handleSubmit(e) {
    e.preventDefault();
    setTried(true);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;
    try {
      setBusy(true);
      await onSubmit({ fullName: fullName.trim(), email, password });
    } catch (err) {
      setFormError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      tag="Inspector Registration"
      logoSrc={logoSrc}
      footer={
        <button type="submit" form="setup-form" className="bv__cta" disabled={busy}>
          {busy ? "Registering…" : "Authenticate & Register Account"}
        </button>
      }
    >
      <style>{css}</style>
      <h1 className="bv__title">Complete Profile Setup</h1>
      <p className="bv__sub">
        Please verify your personal information and establish your secure account passwords.
      </p>

      <form id="setup-form" onSubmit={handleSubmit} noValidate>
        <div className="bv__card ps__card">
          <div className="ps__field">
            <label className="bv__label" htmlFor="ps-name">Full name</label>
            <input id="ps-name" type="text" autoComplete="name" className="ps__input"
                   value={fullName} onChange={(e) => setFullName(e.target.value)}
                   aria-invalid={!!show("name")} />
            {show("name") && <span className="ps__err">{errors.name}</span>}
          </div>

          <div className="ps__field">
            <label className="bv__label" htmlFor="ps-email">Email address</label>
            <input id="ps-email" type="email" autoComplete="email" className="ps__input"
                   value={email} onChange={(e) => setEmail(e.target.value)}
                   aria-invalid={!!show("email")} />
            {show("email") && <span className="ps__err">{errors.email}</span>}
          </div>

          <div className="ps__hr" />

          <div className="ps__field">
            <label className="bv__label" htmlFor="ps-pw">Create password</label>
            <div className="ps__wrap">
              <input id="ps-pw" type={showPw ? "text" : "password"} autoComplete="new-password"
                     className="ps__input ps__input--pw"
                     value={password} onChange={(e) => setPassword(e.target.value)}
                     aria-invalid={!!show("password")} />
              <EyeToggle shown={showPw} onToggle={() => setShowPw((v) => !v)} />
            </div>
            {show("password") && <span className="ps__err">{errors.password}</span>}
          </div>

          <div className="ps__field">
            <label className="bv__label" htmlFor="ps-confirm">Confirm password</label>
            <div className="ps__wrap">
              <input id="ps-confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password"
                     className="ps__input ps__input--pw"
                     value={confirm} onChange={(e) => setConfirm(e.target.value)}
                     aria-invalid={!!show("confirm")} />
              <EyeToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
            </div>
            {show("confirm") && <span className="ps__err">{errors.confirm}</span>}
          </div>

          <div className="ps__field">
            <div className="ps__terms">
              <label>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                Terms &amp; Conditions
              </label>
              <button type="button" className="ps__doc" onClick={onViewTerms} aria-label="Read terms and conditions">
                <Svg size={20}>
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" /><path d="m9 14 2 2 4-4" />
                </Svg>
              </button>
            </div>
            {show("terms") && <span className="ps__err">{errors.terms}</span>}
          </div>
        </div>
        {formError && <div className="ps__banner" role="alert">{formError}</div>}
      </form>
    </AppShell>
  );
}