import LogoutButton from './LogoutButton';
import { useEffect, useState } from 'react';
import navLogo from './bison_logo_nav.png';
import { detailFields } from './clientData';
import { listClients } from './bidsApi';
import AddClientDialog from './AddClientDialog';
import './Clientspage.css';

export default function Clientspage() {
    const [clientId, setClientId] = useState(() => new URLSearchParams(window.location.search).get('clientId'));
    const [rows, setRows] = useState([]);
    const client = rows.find((row) => String(row.id) === clientId);
    const [menuOpen, setMenuOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        listClients(controller.signal)
            .then((clients) => { if (!controller.signal.aborted) setRows(clients); })
            .catch((error) => { if (!controller.signal.aborted) setError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [attempt]);
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
                {menuOpen && <div className="hamburger_dropdown"><LogoutButton /></div>}
            </nav>
        <header className="bid_page_header"><div className="bid_details_toolbar">
            <a href="/Clients" className="bid_back_button">← Back</a>
            <h1 className="bidspage_header">Client Information</h1>
            <button type="button" className="bid_add_button" disabled={loading || !!error} onClick={() => setAdding(true)}>+ Add Client</button>
        </div></header>
        <div className="client_information_layout"><div className="client_information_content">
            <main className="fieldsframe" aria-label="Client information">
                {notice && <p className="bid_creation_message" role="status">{notice}</p>}
                {loading && <p role="status">Loading client…</p>}
                {error && <p role="alert" className="add_bid_error">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
                {!loading && !error && !client && <p className="bid_details_empty">{clientId ? 'Client not found.' : 'Select a client from the Clients page to view their information.'}</p>}
                {!loading && !error && client && <div className="client_inline_form">
                    {detailFields.map(([field, label]) => <div className="bid_detail_field" key={field}>
                        <label htmlFor={`view-client-${field}`}>{label}</label>
                        <input id={`view-client-${field}`} readOnly value={client[field] || 'Not provided'} />
                    </div>)}
                </div>}
            </main>
        </div></div>
        {adding && <AddClientDialog onClose={() => setAdding(false)} onCreated={(client) => {
            setRows((previous) => [...previous, client]); setClientId(String(client.id));
            window.history.replaceState(null, '', `/Clientspage?clientId=${client.id}`);
            setAdding(false); setNotice('Client has been added.');
        }} />}
        <footer className="bid_page_footer" />
    </div>;
}
