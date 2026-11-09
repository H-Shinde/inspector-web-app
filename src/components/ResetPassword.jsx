import { useState } from 'react';
import AppShell from './AppShell';
import { inspectorRequest } from '../inspectorApi';
import { passwordPageCss } from './ForgotPassword';

export default function ResetPassword({ logoSrc, onLogin }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const submit = async (event) => {
        event.preventDefault();
        if (busy) return;
        setError('');
        if (!password || password !== confirm) { setError('Enter matching passwords in both fields.'); return; }
        setBusy(true);
        try {
            const query = new URLSearchParams(window.location.search);
            await inspectorRequest('/api/auth/password-reset-confirm/', { uid: query.get('uid'), token: query.get('token'), new_password1: password, new_password2: confirm });
            setDone(true); window.history.replaceState(null, '', window.location.pathname.startsWith('/inspector') ? '/inspector/' : '/');
        } catch (error) { setError(error.message); }
        finally { setBusy(false); }
    };
    return <AppShell logoSrc={logoSrc} tag="Reset Password" footer={done
        ? <button type="button" className="bv__cta" onClick={onLogin}>Back to Log In</button>
        : <button type="submit" form="reset-password" className="bv__cta" disabled={busy}>{busy ? 'Saving…' : 'Save New Password'}</button>}>
        <style>{passwordPageCss}</style>
        {done && <div className="fp__badge"><div className="fp__dot" aria-hidden="true">✓</div></div>}
        <h1 className={`bv__title${done ? ' fp__center' : ''}`}>{done ? 'Password updated' : 'Choose a new password'}</h1>
        <p className={`bv__sub${done ? ' fp__center fp__sub' : ''}`}>{done ? 'Sign in with your new password.' : 'Create a new password for your account and enter it again to confirm.'}</p>
        {!done && <><form id="reset-password" noValidate onSubmit={submit}>
            <div className="bv__card fp__card">
                <label className="bv__label" htmlFor="reset-password-new">New password</label>
                <input className="fp__input" id="reset-password-new" type="password" autoComplete="new-password" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} autoFocus />
                <label className="bv__label" htmlFor="reset-password-confirm">Confirm password</label>
                <input className="fp__input" id="reset-password-confirm" type="password" autoComplete="new-password" value={confirm} disabled={busy} onChange={(event) => setConfirm(event.target.value)} />
            </div>
            {error && <div className="fp__banner" role="alert">{error}</div>}
        </form><button type="button" className="fp__link" disabled={busy} onClick={onLogin}>Back to Log In</button></>}
    </AppShell>;
}
