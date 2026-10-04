import './App.css';
import logo from './bison_logo__login.png';

function UpdatePass() {
    
  const handleUpdateClick = () => {
    window.location.href= '/App';
  };
  return (
    <div className="frame">
          <img
            className="login_image"
            src={logo}
            alt="Bison Valuation"
          />
          <p className="welcome_back">Confirm Password?</p>
          <p className="verify_personal_info">Enter your new password and confirm below.</p>

          <div className="enter_password_frame">
            <div className='register_email_frame'>
              <div className='register_email_frame_second'>
                  <p className='register_email_typography'>Assign Secure Password</p>
              </div>
              <div className='password_place'>
                <input className='password_actual' type="password" placeholder="••••••••••••" />
              </div>
               <p className='password_constraint'>Must contain 12+ characters, symbols & numbers</p>

            </div>
            <div className='password_frame'>
              <div className='password_box'>
                <p className='password_type'>Confirm Secure Password</p>
              </div>
              <div className='password_place'>
                <input className='password_actual' type="password" placeholder="••••••••••••" />
              </div>
            </div>
          </div>
           <button   onClick={handleUpdateClick}  className='login_button'>
              <p className='login_type'>Continue</p>
            </button>
          
    </div>
  );
}


export default UpdatePass;
