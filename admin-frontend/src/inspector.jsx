import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaCheck, FaEnvelope, FaEye, FaFilter } from 'react-icons/fa';
import { emptyInspector, InspectorFormFields } from './inspectorFields';
import navLogo from './bison_logo_nav.png';
import './inspector.css';
import { addInvitedInspector, getInspectors, selectGlobalInspector, useSelectedInspector } from './inspectorSelection';

DataTable.use(DT);

const fields = [['id', '# ID'], ['name', 'Name'], ['distance', 'Distance'], ['company', 'Company'], ['status', 'Status'], ['focus', 'Focus']];
const columns = [
    ...fields.map(([data, title]) => ({ data, title, defaultContent: '', render: data === 'distance'
        ? (value, type) => type === 'display' ? (value === '' || value == null ? 'Not provided' : `${Number(value)} miles`) : value
        : DT.render.text() })),
    { data: null, title: 'Actions', orderable: false, searchable: false },
];
const emptyDraft = emptyInspector;

function InspectorActions({ row, onSelect, onMessage, onView }) {
    const selectedInspector = useSelectedInspector();
    const selected = selectedInspector?.id === row.id;
    return <div className="action_buttons">
        <button type="button" title={selected ? 'Deselect inspector' : 'Select inspector'} aria-label={`Select ${row.name}`} aria-pressed={selected} onClick={() => onSelect(row)}><FaCheck /></button>
        <button type="button" title="Message inspector" aria-label={`Message ${row.name}`} onClick={() => onMessage(row)}><FaEnvelope /></button>
        <button type="button" title="View inspector" aria-label={`View ${row.name}`} onClick={() => onView(row)}><FaEye /></button>
    </div>;
}

export default function Inspector() {
    const [rows, setRows] = useState(getInspectors);
    const [filterColumn, setFilterColumn] = useState('all');
    const [filterValue, setFilterValue] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [modal, setModal] = useState(null);
    const [draft, setDraft] = useState(emptyDraft);
    const [notice, setNotice] = useState('');
    const table = useRef(null);
    const dialog = useRef(null);
    useEffect(() => { if (modal && !dialog.current.open) dialog.current.showModal(); }, [modal]);
    useEffect(() => {
        if (!notice) return;
        const dismiss = () => setNotice('');
        document.addEventListener('click', dismiss, true);
        return () => document.removeEventListener('click', dismiss, true);
    }, [notice]);
    const closeModal = () => { dialog.current.close(); setModal(null); };
    const handleFilter = (column, value) => {
        setFilterColumn(column);
        setFilterValue(value);
        const api = table.current?.dt();
        if (!api) return;
        api.columns().search('');
        api.search('');
        if (column === 'all') api.search(value);
        else api.column(Number(column)).search(value);
        api.draw();
    };
    const selectInspector = (row) => {
        const next = sessionStorage.getItem('selectedInspectorId') === String(row.id) ? null : String(row.id);
        selectGlobalInspector(next);
        setNotice(next ? `${row.name} selected and assigned to the current job, if available.` : 'Inspector selection cleared.');
    };
    const inviteInspector = (event) => {
        event.preventDefault();
        if (!draft.name.trim() || !draft.email.trim()) return;
        const invited = addInvitedInspector(draft);
        setRows(getInspectors());
        handleFilter('all', '');
        closeModal();
        setNotice(`Demo: an invite has been sent to ${invited.email}. No actual email was delivered.`);
    };
    return (
        <div className="frame_home bid_details_page inspector_page">
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
            <main className="main_content">
                <div className="table_header"><div><h1>Inspectors</h1><p>Find inspectors and manage invitations.</p></div></div>
                {notice && <p className="inspector_notice" role="status">{notice}</p>}
                <section className="bids_panel" aria-label="Inspectors">
                    <div className="table_top_header">
                        <div className="filter_controls">
                            <details className="bid_filter">
                                <summary className="filter_button"><FaFilter aria-hidden="true" /> Filter</summary>
                                <fieldset className="filter_menu"><legend>Search in</legend>
                                    {[['all', 'All columns'], ...fields.map(([, title], index) => [String(index), title])].map(([value, label]) => (
                                        <label key={value}><input type="radio" name="inspector-filter-column" value={value} checked={filterColumn === value} onChange={() => handleFilter(value, filterValue)} />{label}</label>
                                    ))}
                                </fieldset>
                            </details>
                            <input className="filter_input" aria-label="Filter inspectors" placeholder="Filter..." value={filterValue} onChange={(event) => handleFilter(filterColumn, event.target.value)} />
                            {filterValue && <button className="filter_button" type="button" onClick={() => handleFilter('all', '')}>Clear</button>}
                        </div>
                        <button type="button" className="add_bid_button" onClick={() => { setDraft({ ...emptyDraft }); setModal({ mode: 'invite' }); }}>+ Invite Inspector</button>
                    </div>
                    <div className="bids_table_container">
                        <DataTable ref={table} data={rows} columns={columns} className="bids_table"
                            slots={{ 6: (data, type, row) => <InspectorActions row={row} onSelect={selectInspector}
                                onMessage={(inspector) => {
                                    selectGlobalInspector(inspector.id);
                                    window.location.href = `/Messaging?inspectorId=${encodeURIComponent(inspector.id)}`;
                                }}
                                onView={(inspector) => { window.location.href = `/InspectorView?inspectorId=${encodeURIComponent(inspector.id)}`; }} /> }}
                            options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                                layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' },
                                language: { emptyTable: 'No inspectors found.' } }} />
                    </div>
                </section>
            </main>
            <dialog ref={dialog} className="popup" aria-labelledby="inspector-dialog-title" onCancel={(event) => { event.preventDefault(); closeModal(); }}>
                {modal && <>
                    <div className="bid_form_header"><h2 id="inspector-dialog-title">{modal.mode === 'invite' ? 'Invite Inspector' : modal.mode === 'message' ? `Message ${modal.inspector.name}` : 'Inspector details'}</h2><button type="button" className="bid_form_close" aria-label="Close dialog" onClick={closeModal}>×</button></div>
                    {modal.mode === 'invite' ? <form onSubmit={inviteInspector}>
                        <InspectorFormFields draft={draft} onChange={(field, value) => setDraft({ ...draft, [field]: value })} />
                        <div className="actions"><button type="button" className="bid_form_cancel" onClick={closeModal}>Cancel</button><button type="submit" className="bid_form_save" disabled={!draft.name.trim() || !draft.email.trim()}>Send Invite</button></div>
                    </form> : modal.mode === 'view' ? <>
                        <dl className="inspector_details">{[...fields, ['email', 'Email']].map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{field === 'distance' && modal.inspector[field] !== '' ? `${modal.inspector[field]} miles` : modal.inspector[field] || 'Not provided'}</dd></div>)}</dl>
                        <div className="actions"><button type="button" className="bid_form_cancel" onClick={closeModal}>Done</button></div>
                    </> : <>
                        <div className="bid_form_body"><p>Open an email draft to {modal.inspector.email}.</p><p className="bid_form_hint">Sample inspectors use fictional email addresses.</p></div>
                        <div className="actions"><button type="button" className="bid_form_cancel" onClick={closeModal}>Cancel</button><a className="bid_form_save" href={`mailto:${encodeURIComponent(modal.inspector.email)}`}>Open email draft</a></div>
                    </>}
                </>}
            </dialog>
            <footer className="bid_page_footer" />
        </div>
    );
}
