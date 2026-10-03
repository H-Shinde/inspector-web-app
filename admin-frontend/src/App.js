import './App.css';
import logo from './bison_logo__login.png';
function App() {
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
                <p className='email_type'>Email@gmail.com</p>
              </div>
            </div>
            <div className='password_frame'>
              <div className='password_box'>
                <p className='password_type'>Password</p>
              </div>
              <div className='password_place'>
                <p className='password_actual'>••••••••••••</p>
              </div>
              <p className='forgot_password'>forgot password</p>
            </div>
          </div>
           <button className='login_button'>
              <p className='login_type'>Login</p>
            </button>
          
    </div>
  );
}

export default App;
