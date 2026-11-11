import { useEffect, useState } from 'react';
import AppShell from './AppShell';
import { inspectorRequest } from '../inspectorApi';

export default function InvitationGate({ token, logoSrc, onLogin, children }) {
    const [invitation, setInvitation] = useState(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        setInvitation(null); setError('');
        if (!token) { setError('Registration is invite-only. Open the link in your invitation email.'); return; }
        inspectorRequest(`/api/inspector-registration/?token=${encodeURIComponent(token)}`)
            .then((result) => { if (active) setInvitation(result); })
            .catch((error) => { if (active) setError(error.message); });
        return () => { active = false; };
    }, [token, attempt]);
    if (invitation) return children(invitation);
    return <AppShell tag="Invite only" logoSrc={logoSrc}>
        <h1 className="bv__title">{error ? 'Invitation unavailable' : 'Checking your invitation'}</h1>
        {error ? <><p className="bv__sub" role="alert">{error}</p><p className="bv__sub">Ask your administrator for a new invitation if this link has expired or was replaced.</p>
            <button type="button" className="bv__cta" style={{ marginTop: 24 }} onClick={() => setAttempt((value) => value + 1)}>Check again</button>
            <button type="button" className="bv__cta" style={{ marginTop: 12 }} onClick={onLogin}>Already registered? Log in</button></>
            : <p className="bv__sub" role="status">Please wait while we verify your registration link.</p>}
    </AppShell>;
}
