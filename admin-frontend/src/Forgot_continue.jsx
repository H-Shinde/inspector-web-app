import AuthLayout from './AuthLayout';

function UpdatePass() {
  return (
    <AuthLayout title="Set a new password" description="Choose a new password, then enter it again to confirm.">
      <form className="auth_form" onSubmit={(event) => { event.preventDefault(); window.location.href = '/'; }}>
        <div className="auth_field">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" placeholder="Enter your new password" aria-describedby="password-hint" />
          <p className="auth_hint" id="password-hint">Use 12+ characters, including numbers and symbols.</p>
        </div>
        <div className="auth_field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your new password" />
        </div>
        <button className="auth_submit" type="submit">Continue <span aria-hidden="true">→</span></button>
        <p className="auth_secondary"><a href="/">← Back to sign in</a></p>
      </form>
    </AuthLayout>
  );
}

export default UpdatePass;
