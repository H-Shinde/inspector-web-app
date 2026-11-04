import ValidatedForm from './ValidatedForm';
import { useEffect, useState } from 'react';
import { authPost, getCurrentUser } from './authApi';
import './App.css';
import AuthLayout from './AuthLayout';
import ForgotPassword from './Forgot_pass';
import UpdatePass from './Forgot_continue';
import Homepage from './BidsJobsHomepage';
import JobHomepage from './Jobspagehomepage';
import AddBidpage from './AddBidpage';
import Jobspage from './Jobspage';
import Bidspage from './Bidspage';
import History from './history';
import Inspector from './inspector';
import InspectorView from './inspector_view';
import Messaging from './messaging';
import Clients from './clients';
import Clientspage from './Clientspage';
import Reports from './reports';
import ReportsNext from './reports_next';
import Settings from './Settings';
const privateRoutes = {
  '/Settings': Settings, '/settings': Settings,
  '/ReportsNext': ReportsNext, '/Reports': Reports, '/reports': Reports,
  '/Clientspage': Clientspage, '/clientspage': Clientspage,
  '/Clients': Clients, '/clients': Clients,
  '/Messaging': Messaging, '/messaging': Messaging,
  '/InspectorView': InspectorView, '/inspector_view': InspectorView,
  '/Inspector': Inspector, '/inspector': Inspector,
  '/History': History, '/history': History,
  '/Jobspage': Jobspage, '/AddBid': AddBidpage,
  '/Homepage': Homepage, '/JobHomepage': JobHomepage, '/Bidspage': Bidspage,
};

function safeDestination(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/Homepage';
  const url = new URL(value, window.location.origin);
  return url.origin === window.location.origin && privateRoutes[url.pathname] ? `${url.pathname}${url.search}${url.hash}` : '/Homepage';
}

function Login({ destination }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const handleLogin = async (event) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await authPost('login', { email: form.get('email').trim(), password: form.get('password') });
      window.location.assign(destination);
    } catch (error) { setError(error.message); setBusy(false); }
  };
  return <AuthLayout title="Welcome back" description="Sign in to manage your bids, inspections, and appraisal jobs.">
    <ValidatedForm className="auth_form" onSubmit={handleLogin} aria-label="Sign in" aria-busy={busy}>
      <div className="auth_field">
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" name="email" type="email" required autoComplete="username" placeholder="you@example.com" disabled={busy} />
      </div>
      <div className="auth_field">
        <div className="auth_label_row"><label htmlFor="login-password">Password</label><a href="/ForgotPassword">Forgot password?</a></div>
        <input id="login-password" name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" disabled={busy} />
      </div>
      {error && <p role="alert" className="auth_error">{error}</p>}
      <button className="auth_submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </ValidatedForm>
  </AuthLayout>;
}

function App() {
  const path = window.location.pathname;
  const passwordPage = path === '/ForgotPassword' || path === '/UpdatePass';
  const [session, setSession] = useState({ loading: !passwordPage, user: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (passwordPage) return;
    const controller = new AbortController();
    setSession({ loading: true, user: null, error: '' });
    getCurrentUser(controller.signal).then((user) => {
      if (!controller.signal.aborted) setSession({ loading: false, user, error: '' });
    }).catch((error) => {
      if (!controller.signal.aborted) setSession({ loading: false, user: null, error: error.message });
    });
    return () => controller.abort();
  }, [passwordPage, attempt]);

  if (path === '/ForgotPassword') return <ForgotPassword />;
  if (path === '/UpdatePass') return <UpdatePass />;
  if (session.loading) return <AuthLayout title="Checking your session" description="Please wait while we verify your sign-in."><p role="status">Loading…</p></AuthLayout>;
  if (session.error) return <AuthLayout title="Unable to check your session" description="Please try again to continue."><p role="alert" className="auth_error">{session.error}</p><button type="button" className="auth_submit" onClick={() => setAttempt((value) => value + 1)}>Try again</button></AuthLayout>;
  const Page = privateRoutes[path];
  if (!session.user) {
    const next = Page ? `${path}${window.location.search}${window.location.hash}` : new URLSearchParams(window.location.search).get('next');
    return <Login destination={safeDestination(next)} />;
  }
  if (Page) return <Page />;
  return <Homepage />;
}

export default App;
