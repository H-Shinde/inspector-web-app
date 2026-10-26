import ValidatedForm from './ValidatedForm';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createBidInspector } from './bidsApi';

export default function CreateBidInspector({ disabled, onCreated }) {
    const dialog = useRef(null);
    const [draft, setDraft] = useState({ name: '', email: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const close = () => { if (!busy) dialog.current.close(); };
    const save = async (event) => {
        event.preventDefault(); event.stopPropagation();
        if (busy) return;
        setBusy(true); setError('');
        try {
            const inspector = await createBidInspector({ name: draft.name.trim(), email: draft.email.trim() });
            onCreated(inspector); dialog.current.close();
        } catch (error) { setError(error.message); }
        finally { setBusy(false); }
    };
    return <>
        <button type="button" className="bid_back_button" disabled={disabled} onClick={() => { setDraft({ name: '', email: '' }); setError(''); dialog.current.showModal(); }}>+ Add Inspector</button>
        {createPortal(<dialog ref={dialog} className="popup" aria-labelledby="create-bid-inspector-title" onCancel={(event) => { event.preventDefault(); close(); }}>
            <ValidatedForm onSubmit={save} aria-label="Add inspector">
                <div className="bid_form_header"><h2 id="create-bid-inspector-title">Add Inspector</h2><button type="button" className="bid_form_close" aria-label="Close inspector" disabled={busy} onClick={close}>×</button></div>
                <div className="bid_form_body">
                    <div className="bid_form_field"><label htmlFor="create-bid-inspector-name">Inspector name</label><input id="create-bid-inspector-name" required maxLength={200} value={draft.name} disabled={busy} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
                    <div className="bid_form_field"><label htmlFor="create-bid-inspector-email">Inspector email</label><input id="create-bid-inspector-email" required type="email" maxLength={254} value={draft.email} disabled={busy} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></div>
                    {error && <p className="add_bid_error" role="alert">{error}</p>}
                </div>
                <div className="actions"><button type="button" className="bid_form_cancel" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="bid_form_save" disabled={busy || !draft.name.trim() || !draft.email.trim()}>{busy ? 'Saving…' : 'Save Inspector'}</button></div>
            </ValidatedForm>
        </dialog>, document.body)}
    </>;
}
