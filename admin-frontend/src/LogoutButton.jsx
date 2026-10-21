import { useState } from 'react';
import { authPost } from './authApi';

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logout = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await authPost('logout');
      window.location.assign('/');
    } catch (error) { setError(error.message); setBusy(false); }
  };
  return <>
    <button type="button" className="logout_button" disabled={busy} onClick={logout}>{busy ? 'Signing out…' : 'Logout'}</button>
    {error && <p className="logout_error" role="alert">{error}</p>}
  </>;
}
