import StateSelect from '../StateSelect';
import { useEffect, useState } from 'react';
import { inspectorRequest } from '../inspectorApi';

export default function ProfileEditor({ onSaved, onClose }) {
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { inspectorRequest('/api/inspector/profile/').then(setDraft).catch((error) => setError(error.message)); }, []);
    return <section className="ix__card" aria-label="Edit inspector profile" style={{ padding: 20, marginTop: 20 }}>
        <h2>Edit Profile</h2>
        {error && <p role="alert">{error}</p>}
        {!draft ? <p>Loading profile…</p> : <form noValidate onSubmit={async (event) => {
            event.preventDefault(); if (busy) return; setBusy(true); setError('');
            try { const values = Object.fromEntries(['name','phone','address','city','state','zipCode'].map((field) => [field, draft[field] || '']));
                const result = await inspectorRequest('/api/inspector/profile/', values); onSaved(result);
            } catch (error) { setError(error.message); } finally { setBusy(false); }
        }}>
            {[['name','Full name'],['phone','Phone'],['address','Street address'],['city','City'],['state','State'],['zipCode','ZIP code']].map(([field,label]) => <div key={field} style={{ margin: '12px 0' }}>
                <label htmlFor={`profile-${field}`}>{label}</label>
                {field === 'state' ? <StateSelect id={`profile-${field}`} value={draft.state} disabled={busy} onChange={(event) => setDraft({ ...draft, state: event.target.value })} /> : <input id={`profile-${field}`} style={{ display: 'block', width: '100%', padding: 10, boxSizing: 'border-box' }} value={draft[field] || ''} disabled={busy} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} />}
            </div>)}
            <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Profile'}</button>
        </form>}
    </section>;
}
