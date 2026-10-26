import { useEffect, useRef, useState } from 'react';
import ValidatedForm from './ValidatedForm';
import { createClient } from './bidsApi';
import { detailFields, newClient } from './clientData';

export default function AddClientDialog({ onCreated, onClose }) {
    const dialog = useRef(null);
    const saving = useRef(false);
    const [draft, setDraft] = useState(newClient);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { dialog.current.showModal(); }, []);
    const close = () => { if (!saving.current) onClose(); };
    const save = async (event) => {
        event.preventDefault();
        if (saving.current) return;
        saving.current = true;
        setBusy(true); setError('');
        let client;
        try {
            client = await createClient(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])));
        } catch (error) {
            setError(error.message);
            saving.current = false;
            setBusy(false);
            return;
        }
        saving.current = false;
        onCreated(client);
    };
    return <dialog ref={dialog} className="popup" aria-labelledby="add-client-title" onCancel={(event) => { event.preventDefault(); close(); }}>
        <ValidatedForm onSubmit={save} aria-label="Add client" aria-busy={busy}>
            <div className="bid_form_header">
                <h2 id="add-client-title">Add Client</h2>
                <button type="button" className="bid_form_close" aria-label="Close dialog" disabled={busy} onClick={close}>×</button>
            </div>
            {error && <p role="alert" className="add_bid_error">{error}</p>}
            <div className="bid_form_body bid_form_grid">
                {detailFields.map(([field, label, type, maxLength]) => <div className="bid_form_field" key={field}>
                    <label htmlFor={`add-client-${field}`}>{label}</label>
                    <input id={`add-client-${field}`} name={field} type={type} maxLength={maxLength}
                        required={field === 'name'} disabled={busy} value={draft[field]}
                        placeholder={field === 'state' ? 'NY' : field === 'zipCode' ? '10001' : undefined}
                        onChange={(event) => setDraft({ ...draft, [field]: field === 'state' ? event.target.value.toUpperCase() : event.target.value })} />
                </div>)}
            </div>
            <div className="actions">
                <button type="button" className="bid_form_cancel" disabled={busy} onClick={close}>Cancel</button>
                <button type="submit" className="bid_form_save" disabled={busy || !draft.name.trim()}>{busy ? 'Saving…' : 'Save Client'}</button>
            </div>
        </ValidatedForm>
    </dialog>;
}
