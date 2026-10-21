import { useState } from 'react';
import AuthLayout from './AuthLayout';
import { authPost } from './authApi';

function ForgotPassword() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = new FormData(event.currentTarget).get('email').trim();
    setBusy(true); setError('');
    try { await authPost('password-reset', { email }); setSent(true); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  return <AuthLayout title={sent ? 'Check your email' : 'Forgot password?'} description={sent ? 'If an account matches that email, you will receive a password-reset link.' : 'Enter your registered email to receive a password-reset link.'}>
    {sent ? <p role="status">Follow the link in your email to choose a new password.</p> : <form className="auth_form" onSubmit={submit} aria-label="Request password reset" aria-busy={busy}>
      <div className="auth_field">
        <label htmlFor="reset-email">Registered email address</label>
        <input id="reset-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" disabled={busy} />
      </div>
      {error && <p role="alert" className="auth_error">{error}</p>}
      <button className="auth_submit" type="submit" disabled={busy}>{busy ? 'Requesting link…' : 'Send reset link'}</button>
    </form>}
    <p className="auth_secondary"><a href="/">Back to sign in</a></p>
  </AuthLayout>;
}

export default ForgotPassword;
