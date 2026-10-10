import { useEffect, useRef, useState } from 'react';
import navLogo from './bison_logo_nav.png';
import { addInvitedInspector, getInspectors } from './inspectorSelection';
import { emptyInspector, inspectorFields, InspectorFormFields } from './inspectorFields';
import './inspector_view.css';

export default function InspectorView() {
    const requestedId = new URLSearchParams(window.location.search).get('inspectorId');
    const [inspector, setInspector] = useState(() => getInspectors().find((entry) => String(entry.id) === requestedId));
    const [menuOpen, setMenuOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState({ ...emptyInspector });
    const [notice, setNotice] = useState('');
    const dialog = useRef(null);
    useEffect(() => { if (adding && !dialog.current.open) dialog.current.showModal(); }, [adding]);
    useEffect(() => {
        if (!notice) return;
        const dismiss = () => setNotice('');
        document.addEventListener('click', dismiss, true);
        return () => document.removeEventListener('click', dismiss, true);
    }, [notice]);
    const close = () => { dialog.current.close(); setAdding(false); };
    const submit = (event) => {
        event.preventDefault();
        if (!draft.name.trim() || !draft.email.trim()) return;
        const added = addInvitedInspector(draft);
        setInspector(added);
        window.history.replaceState(null, '', `/InspectorView?inspectorId=${added.id}`);
        close();
        setNotice(`Demo: an invite has been sent to ${added.email}. No actual email was delivered.`);
    };
    const display = (field) => {
        const value = inspector?.[field];
        if (value == null || value === '') return 'Not provided';
        return field === 'distance' ? `${value} miles` : String(value);
    };
    return <div className="frame_home bid_details_page inspector_view_page">
            <nav className="nav_bar" aria-label="Main navigation">
                <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                <div className="nav_links">
                    {['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => (
                        <div key={label} className={label === 'Inspector' ? 'bids_box_selected' : ''}>
                            <a className="nav_bar_text" href={label === 'Bids' ? '/Homepage' : `/${label}`} aria-current={label === 'Inspector' ? 'page' : undefined}>{label}</a>
                        </div>
                    ))}
                </div>
                <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                    <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
                </button>
                {menuOpen && <div className="hamburger_dropdown"><a className="logout_button" href="/">Logout</a></div>}
            </nav>
        <header className="bid_page_header"><div className="bid_details_toolbar">
            <a href="/Inspector" className="bid_back_button">← Back</a>
            <h1 className="bidspage_header">Inspector Information</h1>
            <button type="button" className="bid_add_button" onClick={() => { setDraft({ ...emptyInspector }); setAdding(true); }}>+ Add Inspector</button>
        </div></header>
        <main className="fieldsframe" aria-label="Inspector information">
            {notice && <p className="bid_creation_message" role="status">{notice}</p>}
            {!inspector && <p className="bid_details_empty">Select View from the inspector table to open an inspector.</p>}
            {inspectorFields.map(([field, label]) => <div className="bid_detail_field" key={field}>
                <label htmlFor={`inspector-view-${field}`}>{label}</label>
                {field === 'notes' ? <textarea id={`inspector-view-${field}`} readOnly rows={3} value={display(field)} />
                    : <input id={`inspector-view-${field}`} readOnly value={display(field)} />}
            </div>)}
        </main>
        <dialog ref={dialog} className="popup" aria-labelledby="add-inspector-title" onCancel={(event) => { event.preventDefault(); close(); }}>
            {adding && <form onSubmit={submit}>
                <div className="bid_form_header"><h2 id="add-inspector-title">Add Inspector</h2><button type="button" className="bid_form_close" aria-label="Close dialog" onClick={close}>×</button></div>
                <InspectorFormFields draft={draft} onChange={(field, value) => setDraft({ ...draft, [field]: value })} />
                <div className="actions"><button type="button" className="bid_form_cancel" onClick={close}>Cancel</button><button type="submit" className="bid_form_save" disabled={!draft.name.trim() || !draft.email.trim()}>Send Invite</button></div>
            </form>}
        </dialog>
        <footer className="bid_page_footer" />
    </div>;
}
