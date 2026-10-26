import ValidatedForm from './ValidatedForm';
import { useState } from 'react';
import AuthLayout from './AuthLayout';
import { authPost } from './authApi';

function UpdatePass() {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid');
  const token = params.get('token');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !uid || !token) return;
    const data = new FormData(event.currentTarget);
    const new_password1 = data.get('password');
    const new_password2 = data.get('confirmPassword');
    if (new_password1 !== new_password2) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await authPost('password-reset-confirm', { uid, token, new_password1, new_password2 });
      window.history.replaceState(null, '', '/UpdatePass');
      setDone(true);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  if (done) return <AuthLayout title="Password updated" description="Your password has been changed. Sign in with your new password."><a className="auth_submit" href="/">Back to sign in</a></AuthLayout>;
  if (!uid || !token) return <AuthLayout title="Request a reset link" description="Open the password-reset link from your email to set a new password."><a href="/ForgotPassword">Request a new link</a></AuthLayout>;
  return <AuthLayout title="Set a new password" description="Choose a new password, then enter it again to confirm.">
    <ValidatedForm className="auth_form" onSubmit={submit} aria-label="Set new password" aria-busy={busy}>
      <div className="auth_field">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" minLength={8} name="password" type="password" required autoComplete="new-password" disabled={busy} aria-describedby="password-hint" />
        <p className="auth_hint" id="password-hint">Use a strong, unique password. Your new password must meet the account password requirements.</p>
      </div>
      <div className="auth_field">
        <label htmlFor="confirm-password">Confirm password</label>
        <input id="confirm-password" name="confirmPassword" type="password" required autoComplete="new-password" disabled={busy} />
      </div>
      {error && <p role="alert" className="auth_error">{error}</p>}
      <button className="auth_submit" type="submit" disabled={busy}>{busy ? 'Updating password…' : 'Update password'}</button>
      <p className="auth_secondary"><a href="/ForgotPassword">Request a new reset link</a> · <a href="/">Back to sign in</a></p>
    </ValidatedForm>
  </AuthLayout>;
}

export default UpdatePass;
