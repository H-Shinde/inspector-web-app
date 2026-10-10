import './App.css';
import AuthLayout from './AuthLayout';
import ForgotPassword from './Forgot_pass';
import UpdatePass from './Forgot_continue';
import Homepage from './BidsJobsHomepage';
import JobHomepage from './Jobspagehomepage';
import Bidspage from './Bidspage';
import AddBidpage from './AddBidpage';
import Jobspage from './Jobspage';
import History from './history';
import Inspector from './inspector';
import InspectorView from './inspector_view';
import Messaging from './messaging';
import Clients from './clients';
import Clientspage from './Clientspage';
import Reports from './reports';
import ReportsNext from './reports_next';
function App() {
  if (window.location.pathname === '/ReportsNext') {
    return <ReportsNext />;
  }
  if (['/Reports', '/reports'].includes(window.location.pathname)) {
    return <Reports />;
  }
  if (['/Clientspage', '/clientspage'].includes(window.location.pathname)) {
    return <Clientspage />;
  }
  if (['/Clients', '/clients'].includes(window.location.pathname)) {
    return <Clients />;
  }
  if (['/Messaging', '/messaging'].includes(window.location.pathname)) {
    return <Messaging />;
  }
  if (['/InspectorView', '/inspector_view'].includes(window.location.pathname)) {
    return <InspectorView />;
  }
  if (['/Inspector', '/inspector'].includes(window.location.pathname)) {
    return <Inspector />;
  }
  if (['/History', '/history'].includes(window.location.pathname)) {
    return <History />;
  }

  if (window.location.pathname === '/Jobspage') {
    return <Jobspage />;
  }

  if (window.location.pathname === '/AddBid') {
    return <AddBidpage />;
  }

  
 if (window.location.pathname === '/ForgotPassword') {
    return <ForgotPassword />;
  };

  if (window.location.pathname === '/UpdatePass') {
    return <UpdatePass />;
  };
  
  if (window.location.pathname === '/Homepage') {
    return <Homepage />;
  };
  if (window.location.pathname === '/JobHomepage') {
    return <JobHomepage />;
  };
  if (window.location.pathname === '/Bidspage') {
    return <Bidspage/>;
  };

  
  return (
    <AuthLayout title="Welcome back" description="Sign in to manage your bids, inspections, and appraisal jobs.">
      <form className="auth_form" onSubmit={(event) => { event.preventDefault(); window.location.href = '/Homepage'; }}>
        <div className="auth_field">
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" />
        </div>
        <div className="auth_field">
          <div className="auth_label_row">
            <label htmlFor="login-password">Password</label>
            <a href="/ForgotPassword">Forgot password?</a>
          </div>
          <input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" />
        </div>
        <button className="auth_submit" type="submit">Sign in <span aria-hidden="true">→</span></button>
      </form>
    </AuthLayout>
  );
}

export default App;
