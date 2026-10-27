import LogoutButton from './LogoutButton';
import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import navLogo from './bison_logo_nav.png';
import './clients.css';
import { fields } from './clientData';
import { listClients } from './bidsApi';
import AddClientDialog from './AddClientDialog';

DataTable.use(DT);
const columns = fields.map(([data, title]) => ({ data, title, visible: data !== 'id', searchable: data !== 'id', defaultContent: '', render: DT.render.text() }));

export default function Clients() {
    const [rows, setRows] = useState([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const table = useRef(null);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        listClients(controller.signal)
            .then((clients) => { if (!controller.signal.aborted) setRows(clients); })
            .catch((error) => { if (!controller.signal.aborted) setError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [attempt]);
    const handleRowClick = (event) => {
        if (event.target.closest('button, a, input, select')) return;
        const tr = event.target.closest('tbody tr');
        if (!tr || !table.current) return;
        const row = table.current.dt().row(tr).data();
        if (row) window.location.href = `/Clientspage?clientId=${encodeURIComponent(row.id)}`;
    };
    const handleRowKeyDown = (event) => {
        if (event.key === 'Enter' && event.target.tagName === 'TR') handleRowClick(event);
    };
    return <div className="frame_home bid_details_page clients_page">
            <nav className="nav_bar" aria-label="Main navigation">
                <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                <div className="nav_links">
                    {['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging', 'Settings'].map((label) => (
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
        <main className="main_content">
            <header className="table_header"><div><h1>Clients</h1><p>Select a client to view their information.</p></div></header>
            {notice && <p className="clients_notice" role="status">{notice}</p>}
            {loading && <p role="status">Loading clients…</p>}
            {error && <p role="alert" className="add_bid_error">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
            <section className="bids_panel" aria-label="Clients">
                <div className="table_top_header"><button type="button" className="add_bid_button" disabled={loading || !!error} onClick={() => setAdding(true)}>+ Add Client</button></div>
                <div className="bids_table_container" onClick={handleRowClick} onKeyDown={handleRowKeyDown}>
                    <DataTable ref={table} data={rows} columns={columns} className="bids_table"
                        options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                            createdRow: (row) => { row.tabIndex = 0; },
                            layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' },
                            language: { emptyTable: 'No clients have been added.' } }} />
                </div>
            </section>
        </main>
        {adding && <AddClientDialog onClose={() => setAdding(false)} onCreated={(client) => {
            setRows((previous) => [...previous, client]);
            setAdding(false); setNotice('Client has been added.');
        }} />}
        <footer className="bid_page_footer" />
    </div>;
}
