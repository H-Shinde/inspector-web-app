import { useEffect, useRef, useState } from 'react';
import { createInspector, updateInspector } from './inspectorApi';
import { emptyInspector, InspectorFormFields } from './inspectorFields';
import ValidatedForm from './ValidatedForm';
export default function InspectorDialog({ inspector, onSaved, onClose }) {
    const dialog = useRef(null);
    const pending = useRef(false);
    const [draft, setDraft] = useState(() => ({ ...emptyInspector, ...inspector, is_active: inspector?.is_active ?? true }));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { dialog.current.showModal(); }, []);
    const close = () => { if (!pending.current) onClose(); };
    const save = async (event) => {
        event.preventDefault(); if (pending.current) return;
        pending.current = true; setBusy(true); setError('');
        try {
            const saved = inspector ? await updateInspector(inspector.id, draft) : await createInspector({ email: draft.email.trim() });
            onSaved(saved);
        } catch (error) { setError(error.message); }
        finally { pending.current = false; setBusy(false); }
    };
    return <dialog ref={dialog} className="popup" aria-labelledby="inspector-form-title" onCancel={(event) => { event.preventDefault(); close(); }}>
        <ValidatedForm onSubmit={save} aria-label={inspector ? 'Edit inspector' : 'Add inspector'}>
            <div className="bid_form_header"><h2 id="inspector-form-title">{inspector ? 'Edit Inspector' : 'Add Inspector'}</h2><button type="button" className="bid_form_close" aria-label="Close inspector form" disabled={busy} onClick={close}>×</button></div>
            {error && <p role="alert" className="add_bid_error">{error}</p>}
            {inspector ? <InspectorFormFields draft={draft} disabled={busy} onChange={(field, value) => setDraft({ ...draft, [field]: value })} /> :
                <div className="bid_form_body"><div className="bid_form_field"><label htmlFor="new-inspector-email">E-mail</label><input id="new-inspector-email" name="email" type="email" required maxLength={254} disabled={busy} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></div></div>}
            {inspector && <label><input type="checkbox" checked={draft.is_active} disabled={busy} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} /> Active</label>}
            <div className="actions"><button type="button" className="bid_form_cancel" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="bid_form_save" disabled={busy}>{busy ? 'Saving…' : inspector ? 'Save Inspector' : 'Send Invite'}</button></div>
        </ValidatedForm>
    </dialog>;
}
