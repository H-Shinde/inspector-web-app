import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaEdit, FaEye, FaTrash, FaFilter } from 'react-icons/fa';
import navLogo from './bison_logo_nav.png';
import './clients.css';
import { fields, detailFields, loadClients, saveClients } from './clientData';

DataTable.use(DT);
const columns = [...fields.map(([data, title]) => ({ data, title, defaultContent: '', render: DT.render.text() })), { data: null, title: 'Actions', orderable: false, searchable: false }];
export default function Clients() {
    const [rows, setRows] = useState(loadClients);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editor, setEditor] = useState(null);
    const [filterColumn, setFilterColumn] = useState('all');
    const [filterValue, setFilterValue] = useState('');
    const [notice, setNotice] = useState('');
    const table = useRef(null);
    const dialog = useRef(null);
    useEffect(() => { if (editor && !dialog.current.open) dialog.current.showModal(); }, [editor]);
    useEffect(() => {
        const reload = () => setRows(loadClients());
        window.addEventListener('storage', reload);
        return () => window.removeEventListener('storage', reload);
    }, []);
    const close = () => { dialog.current.close(); setEditor(null); };
    const persist = (updated) => { saveClients(updated); setRows(updated); };
    const handleFilter = (column, value) => {
        setFilterColumn(column); setFilterValue(value);
        const api = table.current?.dt();
        if (!api) return;
        api.columns().search(''); api.search('');
        if (column === 'all') api.search(value);
        else api.column(Number(column)).search(value);
        api.draw();
    };
    const save = (event) => {
        event.preventDefault();
        if (!editor.client.name.trim()) return;
        const client = { ...editor.client, name: editor.client.name.trim(), totalBids: Number(editor.client.totalBids || 0) };
        persist(editor.mode === 'add' ? [...rows, client] : rows.map((row) => row.id === client.id ? client : row));
        handleFilter('all', '');
        setNotice(editor.mode === 'add' ? 'Client has been added.' : 'Client has been updated.');
        close();
    };
    const remove = (client) => {
        // Read saved records to keep DataTables action handlers current.
        persist(loadClients().filter((row) => row.id !== client.id));
        setNotice(`${client.name} has been deleted.`);
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
            <header className="table_header"><div><h1>Clients</h1><p>Manage clients and their bid information.</p></div></header>
            {notice && <p className="clients_notice" role="status">{notice}</p>}
            <section className="bids_panel" aria-label="Clients">
                <div className="table_top_header">
                    <div className="filter_controls">
                        <details className="bid_filter"><summary className="filter_button"><FaFilter aria-hidden="true" /> Filter</summary>
                            <fieldset className="filter_menu"><legend>Search in</legend>
                                {[['all', 'All columns'], ...fields.map(([, label], index) => [String(index), label])].map(([value, label]) => <label key={value}><input type="radio" name="client-filter-column" checked={filterColumn === value} onChange={() => handleFilter(value, filterValue)} />{label}</label>)}
                            </fieldset>
                        </details>
                        <input className="filter_input" aria-label="Filter clients" placeholder="Filter..." value={filterValue} onChange={(event) => handleFilter(filterColumn, event.target.value)} />
                        {filterValue && <button type="button" className="filter_button" onClick={() => handleFilter('all', '')}>Clear</button>}
                    </div>
                    <button type="button" className="add_bid_button" onClick={() => setEditor({ mode: 'add', client: { id: Math.max(0, ...rows.map((row) => Number(row.id))) + 1, name: '', totalBids: 0, businessName: '', status: 'Pending', email: '', phone: '', fax: '', cityStateZip: '' } })}>+ Add Client</button>
                </div>
                <div className="bids_table_container"><DataTable ref={table} data={rows} columns={columns} className="bids_table"
                    slots={{ 5: (data, type, row) => <div className="action_buttons">
                        <button type="button" aria-label={`Edit ${row.name}`} title="Edit client" onClick={() => setEditor({ mode: 'edit', client: { ...row } })}><FaEdit /></button>
                        <button type="button" aria-label={`View ${row.name}`} title="View client" onClick={() => { saveClients(loadClients()); window.location.href = `/Clientspage?clientId=${encodeURIComponent(row.id)}`; }}><FaEye /></button>
                        <button type="button" className="delete_icon" aria-label={`Delete ${row.name}`} title="Delete client" onClick={() => remove(row)}><FaTrash /></button>
                    </div> }} options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                        layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' }, language: { emptyTable: 'No clients have been added.' } }} /></div>
            </section>
        </main>
        <dialog ref={dialog} className="popup" aria-labelledby="client-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }}>
            {editor && <form onSubmit={save}>
                <div className="bid_form_header"><h2 id="client-dialog-title">{editor.mode === 'add' ? 'Add Client' : editor.mode === 'edit' ? 'Edit Client' : 'Client Details'}</h2><button type="button" className="bid_form_close" aria-label="Close dialog" onClick={close}>×</button></div>
                <div className="bid_form_body bid_form_grid">{detailFields.map(([field, label]) => <div className="bid_form_field" key={field}>
                    <label htmlFor={`client-${field}`}>{label}</label>
                    {field === 'status' && editor.mode !== 'view' ? <select id={`client-${field}`} value={editor.client[field]} onChange={(event) => setEditor({ ...editor, client: { ...editor.client, [field]: event.target.value } })}><option>Accepted</option><option>Pending</option></select>
                        : <input id={`client-${field}`} type={field === 'email' ? 'email' : ['phone', 'fax'].includes(field) ? 'tel' : field === 'totalBids' ? 'number' : 'text'} min={field === 'totalBids' ? '0' : undefined} step={field === 'totalBids' ? '1' : undefined} readOnly={field === 'id' || editor.mode === 'view'} required={field === 'name'} value={editor.client[field] ?? ''} onChange={(event) => setEditor({ ...editor, client: { ...editor.client, [field]: event.target.value } })} />}
                </div>)}</div>
                <div className="actions"><button type="button" className="bid_form_cancel" onClick={close}>{editor.mode === 'view' ? 'Done' : 'Cancel'}</button>{editor.mode !== 'view' && <button type="submit" className="bid_form_save" disabled={!editor.client.name.trim()}>Save Client</button>}</div>
            </form>}
        </dialog>
        <footer className="bid_page_footer" />
    </div>;
}
