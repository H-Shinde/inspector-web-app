import { useEffect, useRef, useState } from 'react';
import navLogo from './bison_logo_nav.png';
import { detailFields, loadClients, saveClients, newClient } from './clientData';
import './Clientspage.css';

export default function Clientspage() {
    const [clientId, setClientId] = useState(() => new URLSearchParams(window.location.search).get('clientId'));
    const [rows, setRows] = useState(loadClients);
    const client = rows.find((row) => String(row.id) === clientId);
    const [menuOpen, setMenuOpen] = useState(false);
    const [draft, setDraft] = useState(null);
    const [notice, setNotice] = useState('');
    const dialog = useRef(null);
    useEffect(() => { if (draft && !dialog.current.open) dialog.current.showModal(); }, [draft]);
    useEffect(() => {
        const reload = () => setRows(loadClients());
        window.addEventListener('storage', reload);
        return () => window.removeEventListener('storage', reload);
    }, []);
    const close = () => { dialog.current.close(); setDraft(null); };
    const save = (event) => {
        event.preventDefault();
        if (!draft.name.trim()) return;
        const added = { ...draft, id: newClient().id, name: draft.name.trim(), totalBids: Number(draft.totalBids || 0) };
        const updated = [...loadClients(), added];
        saveClients(updated); setRows(updated); setClientId(String(added.id));
        window.history.replaceState(null, '', `/Clientspage?clientId=${added.id}`);
        close(); setNotice('Client has been added.');
    };
    return <div className="frame_home bid_details_page clients_details_page">
            <nav className="nav_bar" aria-label="Main navigation">
                <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                <div className="nav_links">
                    {['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => (
                        <div key={label} className={label === 'Clients' ? 'bids_box_selected' : ''}>
                            <a className="nav_bar_text" href={label === 'Bids' ? '/Homepage' : `/${label}`} aria-current={label === 'Clients' ? 'page' : undefined}>{label}</a>
                        </div>
                    ))}
                </div>
                <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                    <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
                </button>
                {menuOpen && <div className="hamburger_dropdown"><a className="logout_button" href="/">Logout</a></div>}
            </nav>
        <header className="bid_page_header"><div className="bid_details_toolbar">
            <a href="/Clients" className="bid_back_button">← Back</a>
            <h1 className="bidspage_header">Client Information</h1>
            <button type="button" className="bid_add_button" onClick={() => setDraft(newClient())}>+ Add Client</button>
        </div></header>
        <main className="fieldsframe" aria-label="Client information">
            {notice && <p className="bid_creation_message" role="status">{notice}</p>}
            {!client && <p className="bid_details_empty">Select View from the Clients table to open a client.</p>}
            {detailFields.map(([field, label]) => <div className="bid_detail_field" key={field}><label htmlFor={`view-client-${field}`}>{label}</label><input id={`view-client-${field}`} readOnly value={client?.[field] === '' || client?.[field] == null ? 'Not provided' : client[field]} /></div>)}
        </main>
        <dialog ref={dialog} className="popup" aria-labelledby="add-client-title" onCancel={(event) => { event.preventDefault(); close(); }}>
            {draft && <form onSubmit={save}>
                <div className="bid_form_header"><h2 id="add-client-title">Add Client</h2><button type="button" className="bid_form_close" aria-label="Close dialog" onClick={close}>×</button></div>
                <div className="bid_form_body bid_form_grid">{detailFields.map(([field, label]) => <div className="bid_form_field" key={field}>
                    <label htmlFor={`add-client-${field}`}>{label}</label>
                    {field === 'status' ? <select id={`add-client-${field}`} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Accepted</option><option>Pending</option></select>
                        : <input id={`add-client-${field}`} type={field === 'email' ? 'email' : ['phone', 'fax'].includes(field) ? 'tel' : field === 'totalBids' ? 'number' : 'text'} min={field === 'totalBids' ? '0' : undefined} readOnly={field === 'id'} required={field === 'name'} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} />}
                </div>)}</div>
                <div className="actions"><button type="button" className="bid_form_cancel" onClick={close}>Cancel</button><button type="submit" className="bid_form_save" disabled={!draft.name.trim()}>Save Client</button></div>
            </form>}
        </dialog>
        <footer className="bid_page_footer" />
    </div>;
}
