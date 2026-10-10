import AuthLayout from './AuthLayout';

function ForgotPassword() {
  return (
    <AuthLayout title="Forgot password?" description="Enter your registered email to continue resetting your password.">
      <form className="auth_form" onSubmit={(event) => { event.preventDefault(); window.location.href = '/UpdatePass'; }}>
        <div className="auth_field">
          <label htmlFor="reset-name">Full professional name</label>
          <input id="reset-name" name="name" type="text" autoComplete="name" placeholder="Your full name" />
        </div>
        <div className="auth_field">
          <label htmlFor="reset-email">Registered email address</label>
          <input id="reset-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        </div>
        <button className="auth_submit" type="submit">Continue <span aria-hidden="true">→</span></button>
        <p className="auth_secondary">Remember your password? <a href="/">Sign in</a></p>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;
