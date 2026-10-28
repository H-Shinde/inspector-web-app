import LogoutButton from './LogoutButton';
import { useState } from 'react';
import navLogo from './bison_logo_nav.png';
import { inspectorFields } from './inspectorFields';
import useInspectorDirectory from './useInspectorDirectory';
import InspectorDialog from './InspectorDialog';
import './inspector_view.css';
export default function InspectorView() {
    const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('inspectorId'));
    const { inspectors, loading, error, reload } = useInspectorDirectory(true);
    const inspector = inspectors.find((row) => String(row.id) === selectedId);
    const [menuOpen, setMenuOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(false);
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
                {menuOpen && <div className="hamburger_dropdown"><a className="dropdown_link" href="/Settings">Settings</a><LogoutButton /></div>}
            </nav>
        <header className="bid_page_header"><div className="bid_details_toolbar"><a href="/Inspector" className="bid_back_button">← Back</a><h1>Inspector Information</h1><button type="button" className="bid_add_button" onClick={() => setAdding(true)}>+ Add Inspector</button>{inspector && <button type="button" className="bid_form_save" onClick={() => setEditing(true)}>Edit Inspector</button>}</div></header>
        <main className="fieldsframe" aria-label="Inspector information">
            {loading && <p role="status">Loading inspector…</p>}
            {error && <p role="alert">{error} <button type="button" onClick={reload}>Retry</button></p>}
            {!loading && !error && !inspector && <p>Inspector not found.</p>}
            {inspector && inspectorFields.map(([field, label]) => <div className="bid_detail_field" key={field}><label htmlFor={`inspector-view-${field}`}>{label}</label><input id={`inspector-view-${field}`} readOnly value={inspector[field] || 'Not provided'} /></div>)}
        </main>
        {(adding || editing) && <InspectorDialog inspector={editing ? inspector : null} onClose={() => { setAdding(false); setEditing(false); }} onSaved={(saved) => {
            setSelectedId(String(saved.id)); window.history.replaceState(null, '', `/InspectorView?inspectorId=${saved.id}`); setAdding(false); setEditing(false); reload();
        }} />}
        <footer className="bid_page_footer" />
    </div>;
}
