import LogoutButton from './LogoutButton';
import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaEnvelope } from 'react-icons/fa';
import navLogo from './bison_logo_nav.png';
import './inspector.css';
import { inspectorFields } from './inspectorFields';
import { selectGlobalInspector } from './inspectorSelection';
import useInspectorDirectory from './useInspectorDirectory';
import InspectorDialog from './InspectorDialog';
import { updateInspector } from './inspectorApi';

DataTable.use(DT);

const fields = [['id', '# ID'], ['name', 'Name'], ['cityStateZip', 'Location'], ['status', 'Status']];
const columns = [
    ...fields.map(([data, title]) => ({ data, title, visible: data !== 'id', searchable: data !== 'id', defaultContent: '', render: DT.render.text() })),
    { data: null, title: 'Actions', orderable: false, searchable: false },
];
const ACTIONS_COLUMN = fields.length;

function InspectorActions({ row, onMessage, onRate, busy }) {
    return <div className="action_buttons">
        <button type="button" title="Message inspector" aria-label={`Message ${row.name}`} onClick={() => onMessage(row)}><FaEnvelope /></button>
        <button type="button" disabled={busy} title="Rate inspector" aria-label={`Rate ${row.name}`} onClick={() => onRate(row)}><span aria-hidden="true">★</span></button>
    </div>;
}

export default function Inspector() {
    const [viewedInspector, setViewedInspector] = useState(null);
    const detailsDialog = useRef(null);
    const table = useRef(null);
    useEffect(() => { if (viewedInspector && !detailsDialog.current.open) detailsDialog.current.showModal(); }, [viewedInspector]);
    const closeDetails = () => { detailsDialog.current.close(); setViewedInspector(null); };
    const openRow = (event) => {
        if (event.target.closest('button, a, input, select')) return;
        const row = event.target.closest('tbody tr');
        if (!row || !table.current) return;
        const inspector = table.current.dt().row(row).data();
        if (inspector) setViewedInspector(inspector);
    };
    const handleRowKeyDown = (event) => {
        if (['Enter', ' '].includes(event.key) && event.target.tagName === 'TR') {
            event.preventDefault();
            openRow(event);
        }
    };
    const { inspectors: rows, loading, error, reload } = useInspectorDirectory(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(null);
    const [ratingBusy, setRatingBusy] = useState(false);
    const [ratingError, setRatingError] = useState('');
    const [ratingTarget, setRatingTarget] = useState(null);
    const [selectedRating, setSelectedRating] = useState(0);
    const ratingDialog = useRef(null);
    useEffect(() => { if (ratingTarget && !ratingDialog.current.open) ratingDialog.current.showModal(); }, [ratingTarget]);
    const closeRating = () => { if (ratingBusy) return; ratingDialog.current.close(); setRatingTarget(null); setRatingError(''); };
    const rateInspector = async (inspector, rating) => {
        if (ratingBusy) return;
        setRatingBusy(true); setRatingError('');
        try { await updateInspector(inspector.id, { rating }); ratingDialog.current.close(); setRatingTarget(null); reload(); }
        catch (error) { setRatingError(error.message); }
        finally { setRatingBusy(false); }
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
                {menuOpen && <div className="hamburger_dropdown"><a className="dropdown_link" href="/Settings">Settings</a><LogoutButton /></div>}
            </nav>
            <main className="main_content">
                <div className="table_header"><div><h1>Inspectors</h1><p>Manage inspectors and their service locations.</p></div></div>
                {loading && <p role="status">Loading inspectors…</p>}
                {ratingError && <p role="alert">{ratingError}</p>}
                {error && <p role="alert">{error} <button type="button" onClick={reload}>Retry</button></p>}
                <section className="bids_panel" aria-label="Inspectors">
                    <div className="table_top_header">
                        <button type="button" className="add_bid_button" onClick={() => setAdding(true)}>+ Add Inspector</button>
                    </div>
                    <div className="bids_table_container" onClick={openRow} onKeyDown={handleRowKeyDown}>
                        <DataTable ref={table} data={rows} columns={columns} className="bids_table"
                            slots={{ [ACTIONS_COLUMN]: (data, type, row) => <InspectorActions row={row} busy={ratingBusy} onRate={(inspector) => { setSelectedRating(inspector.rating || 0); setRatingError(''); setRatingTarget(inspector); }}
                                onMessage={(inspector) => {
                                    selectGlobalInspector(inspector.id);
                                    window.location.href = `/Messaging?inspectorId=${encodeURIComponent(inspector.id)}`;
                                }} /> }}
                            options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                                layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' },
                                language: { emptyTable: 'No inspectors found.' },
                                createdRow: (row, data) => { row.tabIndex = 0; row.setAttribute('aria-label', `View details for ${data.name}`); } }} />
                    </div>
                </section>
            </main>
            <dialog ref={ratingDialog} className="popup confirm_popup" aria-labelledby="inspector-rating-title" onCancel={(event) => { event.preventDefault(); closeRating(); }}>
                <div className="confirm_body">
                    <h2 id="inspector-rating-title">Rate {ratingTarget?.name}</h2>
                    <p>Choose a rating from 1 to 5 stars.</p>
                    <div role="group" aria-label="Inspector star rating">
                        {[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} disabled={ratingBusy} aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`} aria-pressed={selectedRating === rating}
                            style={{ background: 'transparent', border: 0, cursor: 'pointer', fontSize: '36px', color: rating <= selectedRating ? '#b77900' : '#64748b' }}
                            onClick={() => setSelectedRating(rating)}>{rating <= selectedRating ? '★' : '☆'}</button>)}
                    </div>
                    <p aria-live="polite">{selectedRating ? `${selectedRating} out of 5` : 'No rating selected'}</p>
                    {ratingError && <p role="alert">{ratingError}</p>}
                </div>
                <div className="actions">
                    <button type="button" className="bid_form_cancel" disabled={ratingBusy} onClick={closeRating}>Cancel</button>
                    <button type="button" className="bid_form_save" disabled={ratingBusy || selectedRating < 1} onClick={() => rateInspector(ratingTarget, selectedRating)}>{ratingBusy ? 'Saving…' : 'Save Rating'}</button>
                </div>
            </dialog>
            <dialog ref={detailsDialog} className="popup inspector_details_popup" aria-labelledby="inspector-details-title"
                onCancel={(event) => { event.preventDefault(); closeDetails(); }}
                onClick={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
                {viewedInspector && <>
                    <div className="bid_form_header"><h2 id="inspector-details-title">Inspector Details</h2><button type="button" className="bid_form_close" aria-label="Close inspector details" onClick={closeDetails}>×</button></div>
                    <dl className="inspector_details">
                        {[...inspectorFields, ['status', 'Status']].map(([field, label]) => <div key={field}>
                            <dt>{label}</dt><dd>{viewedInspector[field] === '' || viewedInspector[field] == null ? 'Not provided' : field === 'distance' ? `${viewedInspector[field]} miles` : String(viewedInspector[field])}</dd>
                        </div>)}
                    </dl>
                    <div className="actions"><button type="button" className="bid_form_cancel" onClick={closeDetails}>Close</button><button type="button" className="bid_form_save" onClick={() => { setEditing(viewedInspector); closeDetails(); }}>Edit Inspector</button></div>
                </>}
            </dialog>
            {(adding || editing) && <InspectorDialog inspector={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => { setAdding(false); setEditing(null); reload(); }} />}
            <footer className="bid_page_footer" />
        </div>
    );
}
