import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaTrash, FaFilter } from 'react-icons/fa';
import navLogo from './bison_logo_nav.png';
import './clients.css';
import { fields, detailFields, loadClients, saveClients, newClient } from './clientData';

DataTable.use(DT);
const STATUS_COLUMN = fields.findIndex(([field]) => field === 'status');
const ACTIONS_COLUMN = fields.length;
const columns = [...fields.map(([data, title]) => ({ data, title, visible: data !== 'id', searchable: data !== 'id', defaultContent: '', render: DT.render.text() })), { data: null, title: 'Actions', orderable: false, searchable: false }];

export default function Clients() {
    const [rows, setRows] = useState(loadClients);
    const [menuOpen, setMenuOpen] = useState(false);
    const [draft, setDraft] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [notice, setNotice] = useState('');
    const table = useRef(null);
    const dialog = useRef(null);
    const confirmDialog = useRef(null);
    useEffect(() => { if (draft && !dialog.current.open) dialog.current.showModal(); }, [draft]);
    useEffect(() => { if (deleteTarget && !confirmDialog.current.open) confirmDialog.current.showModal(); }, [deleteTarget]);
    useEffect(() => {
        const reload = () => setRows(loadClients());
        window.addEventListener('storage', reload);
        return () => window.removeEventListener('storage', reload);
    }, []);
    const close = () => { dialog.current.close(); setDraft(null); };
    const closeConfirm = () => { if (confirmDialog.current?.open) confirmDialog.current.close(); setDeleteTarget(null); };
    const persist = (updated) => { saveClients(updated); setRows(updated); };
    const applyStatusFilter = (value) => {
        setStatusFilter(value);
        const api = table.current?.dt();
        if (!api) return;
        api.column(STATUS_COLUMN).search(value === 'all' ? '' : `^${value}$`, { regex: true, smart: false });
        api.draw();
    };
    const save = (event) => {
        event.preventDefault();
        if (!draft.name.trim()) return;
        const client = { ...draft, name: draft.name.trim(), totalBids: Number(draft.totalBids || 0) };
        persist([...rows, client]);
        applyStatusFilter('all');
        setNotice('Client has been added.');
        close();
    };
    const confirmDelete = () => {
        if (deleteTarget) {
            // Read saved records to keep DataTables action handlers current.
            persist(loadClients().filter((row) => row.id !== deleteTarget.id));
            setNotice(`${deleteTarget.name} has been deleted.`);
        }
        closeConfirm();
    };
    const openClient = (row) => {
        saveClients(loadClients());
        window.location.href = `/Clientspage?clientId=${encodeURIComponent(row.id)}`;
    };
    // Clicking anywhere on a row (except its buttons) opens that client's information page.
    const handleRowClick = (event) => {
        if (event.target.closest('button, a, input, select')) return;
        const tr = event.target.closest('tbody tr');
        if (!tr || !table.current) return;
        const row = table.current.dt().row(tr).data();
        if (row) openClient(row);
    };
    const handleRowKeyDown = (event) => {
        if (event.key === 'Enter' && event.target.tagName === 'TR') handleRowClick(event);
    };
    return <div className="frame_home bid_details_page clients_page">
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
        <main className="main_content">
            <header className="table_header"><div><h1>Clients</h1><p>Select a client to view and edit their information.</p></div></header>
            {notice && <p className="clients_notice" role="status">{notice}</p>}
            <section className="bids_panel" aria-label="Clients">
                <div className="table_top_header">
                    <div className="filter_controls">
                        <details className="bid_filter"><summary className="filter_button"><FaFilter aria-hidden="true" /> Filter</summary>
                            <fieldset className="filter_menu"><legend>Status</legend>
                                {[['all', 'All'], ['Accepted', 'Accepted'], ['Pending', 'Pending']].map(([value, label]) => <label key={value}><input type="radio" name="client-status-filter" checked={statusFilter === value} onChange={() => applyStatusFilter(value)} />{label}</label>)}
                            </fieldset>
                        </details>
                    </div>
                    <button type="button" className="add_bid_button" onClick={() => setDraft(newClient())}>+ Add Client</button>
                </div>
                <div className="bids_table_container" onClick={handleRowClick} onKeyDown={handleRowKeyDown}><DataTable ref={table} data={rows} columns={columns} className="bids_table"
                    slots={{ [ACTIONS_COLUMN]: (data, type, row) => <div className="action_buttons">
                        <button type="button" className="delete_icon" aria-label={`Delete ${row.name}`} title="Delete client" onClick={(event) => { event.stopPropagation(); setDeleteTarget(row); }}><FaTrash /></button>
                    </div> }} options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                        createdRow: (row) => { row.tabIndex = 0; },
                        layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' }, language: { emptyTable: 'No clients have been added.' } }} /></div>
            </section>
        </main>
        <dialog ref={dialog} className="popup" aria-labelledby="client-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }}>
            {draft && <form onSubmit={save}>
                <div className="bid_form_header"><h2 id="client-dialog-title">Add Client</h2><button type="button" className="bid_form_close" aria-label="Close dialog" onClick={close}>×</button></div>
                <div className="bid_form_body bid_form_grid">{detailFields.map(([field, label]) => field === 'id' ? <input key={field} type="hidden" name="id" value={draft.id} /> : <div className="bid_form_field" key={field}>
                    <label htmlFor={`client-${field}`}>{label}</label>
                    {field === 'status' ? <select id={`client-${field}`} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}><option>Accepted</option><option>Pending</option></select>
                        : <input id={`client-${field}`} type={field === 'email' ? 'email' : ['phone', 'fax'].includes(field) ? 'tel' : field === 'totalBids' ? 'number' : 'text'} min={field === 'totalBids' ? '0' : undefined} step={field === 'totalBids' ? '1' : undefined} readOnly={field === 'id'} required={field === 'name'} value={draft[field] ?? ''} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} />}
                </div>)}</div>
                <div className="actions"><button type="button" className="bid_form_cancel" onClick={close}>Cancel</button><button type="submit" className="bid_form_save" disabled={!draft.name.trim()}>Save Client</button></div>
            </form>}
        </dialog>
        <dialog ref={confirmDialog} className="popup confirm_popup" aria-labelledby="confirm-client-title" onCancel={(event) => { event.preventDefault(); closeConfirm(); }}>
            {deleteTarget && <div>
                <div className="confirm_body">
                    <h2 id="confirm-client-title">Delete this client?</h2>
                    <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>{deleteTarget.businessName ? ` (${deleteTarget.businessName})` : ''}? This cannot be undone.</p>
                </div>
                <div className="actions">
                    <button type="button" className="bid_form_cancel" onClick={closeConfirm}>Cancel</button>
                    <button type="button" className="bid_form_delete" onClick={confirmDelete}>Delete client</button>
                </div>
            </div>}
        </dialog>
        <footer className="bid_page_footer" />
    </div>;
}