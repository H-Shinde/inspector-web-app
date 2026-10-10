import './App.css';
import logo from './bison_logo__login.png';
function ForgotPassword() {
    
  const handleRememberPasswordClick = () => {
    window.location.href= '/App';
  };
  
  const handleContinueClick = () => {
    window.location.href= '/UpdatePass';
  };
  return (
    <div className="frame">
          <img
            className="login_image"
            src={logo}
            alt="Bison Valuation"
          />
          <p className="welcome_back">Forgot Password?</p>
          <p className="verify_personal_info">Enter your registered email below to receive password reset instructions</p>

          <div className="enter_password_frame">
            <div className='register_email_frame'>
              <div className='register_email_frame_second'>
                  <p className='register_email_typography'>Full Professional Name</p>
              </div>
              <div className='enter_email'>
                <input className='email_type' type="name" placeholder="Coline Size" />
              </div>
            </div>
            <div className='password_frame'>
              <div className='password_box'>
                <p className='password_type'>Registered Email Address</p>
              </div>
              <div className='password_place'>
                <input className='email_type' type="email" placeholder="Email@gmail.com" />
              </div>
             <div style={{whitespace: 'nowrap' }}>
             <p className='remember_password'>Remember Password?</p>
             <p onClick={handleRememberPasswordClick} className='sign_in'>Sign in</p>
             </div>
            </div>
          </div>
           <button onClick={handleContinueClick}  className='login_button'>
              <p className='login_type'>Continue</p>
            </button>
          
    </div>
  );
}


export default ForgotPassword;
