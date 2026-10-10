import './App.css';
import logo from './bison_logo__login.png';
import ForgotPassword from './Forgot_pass';
import UpdatePass from './Forgot_continue';
import Homepage from './BidsJobsHomepage';
import JobHomepage from './Jobspagehomepage';
import Bidspage from './Bidspage';
import AddJobpage from './AddJobpage';
import AddBidpage from './AddBidpage';
import Jobspage from './Jobspage';
function App() {
  if (window.location.pathname === '/AddJob') {
    return <AddJobpage />;
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

  
  const handleForgotPasswordClick = () => {
    window.location.href= '/ForgotPassword';
  };
  const handleloginClick = () => {
    window.location.href = '/Homepage';
  };
  
  return (
    <div className="frame">
          <img
            className="login_image"
            src={logo}
            alt="Bison Valuation"
          />
          <p className="welcome_back">Welcome Back!</p>
          <p className="verify_personal_info">Please verify your personal information and establish your secure account password.</p>

          <div className="enter_password_frame">
            <div className='register_email_frame'>
              <div className='register_email_frame_second'>
                  <p className='register_email_typography'>Registered Email Address</p>
              </div>
              <div className='enter_email'>
                <input className='email_type' type="email" placeholder="Email@gmail.com" />
              </div>
            </div>
            <div className='password_frame'>
              <div className='password_box'>
                <p className='password_actual'>Password</p>
              </div>
              <div className='password_place'>
                <input className='password_actual' type="password" placeholder="••••••••••••" />
              </div>
              <p onClick={handleForgotPasswordClick} className='forgot_password'>
                forgot password
                </p>
            </div>
          </div>
           <button onClick={handleloginClick} className='login_button'>
              <p className='login_type'>Login</p>
            </button>
          
    </div>
  );
}

export default App;

