import { useEffect, useState } from 'react';
import { bidFields, readBidEdits, readBidList } from './bidFields';
import { moveBidToJobs } from './bidTransfers';
import './Bidspage.css';
import navLogo from './bison_logo_nav.png';

function Bidspage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [editDraft, setEditDraft] = useState(null);
    const [notice, setNotice] = useState('');
    const [createdBidId, setCreatedBidId] = useState(() => sessionStorage.getItem('createdBidMessage'));
    useEffect(() => {
        if (!createdBidId) return;
        sessionStorage.removeItem('createdBidMessage');
        const dismissMessage = () => setCreatedBidId(null);
        document.addEventListener('click', dismissMessage);
        document.addEventListener('keydown', dismissMessage);
        return () => {
            document.removeEventListener('click', dismissMessage);
            document.removeEventListener('keydown', dismissMessage);
        };
    }, [createdBidId]);
    const [bid, setBid] = useState(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem('selectedBid') || 'null');
            const requestedId = new URLSearchParams(window.location.search).get('bidId');
            const selected = requestedId ? readBidList('availableBids').find((item) => String(item.id) === requestedId) || saved : saved;
            return selected && selected.status !== 'Accepted' && (!requestedId || String(selected.id) === requestedId) ? { ...selected, ...readBidEdits()[selected.id] } : null;
        } catch {
            return null;
        }
    });
    const [availableBids, setAvailableBids] = useState(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem('availableBids') || '[]');
            return Array.isArray(saved) && saved.length ? saved.filter((item) => item.status !== 'Accepted').map((item) => ({ ...item, ...readBidEdits()[item.id] })) : (bid ? [bid] : []);
        } catch {
            return bid ? [bid] : [];
        }
    });
    const selectBid = (id) => {
        const selected = availableBids.find((item) => item.id === id);
        if (!selected) return;
        setBid(selected);
        setNotice('');
        sessionStorage.setItem('selectedBid', JSON.stringify(selected));
        window.history.replaceState(null, '', `/Bidspage?bidId=${encodeURIComponent(selected.id)}`);
    };
    const saveEdits = (event) => {
        event.preventDefault();
        if (!editDraft?.name.trim()) return;
        const updated = { ...editDraft, name: editDraft.name.trim() };
        const edits = Object.fromEntries(bidFields.filter(([field]) => field !== 'status').map(([field]) => [field, updated[field] ?? '']));
        try {
            localStorage.setItem('bidEdits', JSON.stringify({ ...readBidEdits(), [updated.id]: edits }));
            const updatedBids = availableBids.map((item) => item.id === updated.id ? updated : item);
            sessionStorage.setItem('availableBids', JSON.stringify(updatedBids));
            sessionStorage.setItem('selectedBid', JSON.stringify(updated));
            sessionStorage.setItem('createdBids', JSON.stringify(readBidList('createdBids').map((item) => item.id === updated.id ? updated : item)));
            setAvailableBids(updatedBids); setBid(updated); setEditDraft(null);
            setNotice('Bid information has been saved.');
        } catch { setNotice('Unable to save changes. Please try again.'); }
    };
    const updateStatus = (status) => {
        if (!bid) return;
        const updated = { ...bid, status };
        if (status === 'Accepted') {
            const acceptedJob = moveBidToJobs(updated);
            sessionStorage.setItem('availableBids', JSON.stringify(availableBids.filter((item) => item.id !== bid.id)));
            sessionStorage.removeItem('selectedBid');
            window.location.href = `/Jobspage?jobId=${encodeURIComponent(acceptedJob.id)}`;
            return;
        }
        const updatedBids = availableBids.map((item) => item.id === bid.id ? updated : item);
        let savedStatuses = {};
        try {
            savedStatuses = JSON.parse(sessionStorage.getItem('bidStatuses') || '{}') || {};
        } catch {
            savedStatuses = {};
        }
        sessionStorage.setItem('bidStatuses', JSON.stringify({ ...savedStatuses, [bid.id]: status }));
        sessionStorage.setItem('selectedBid', JSON.stringify(updated));
        sessionStorage.setItem('availableBids', JSON.stringify(updatedBids));
        setBid(updated);
        setAvailableBids(updatedBids);
    };
    const fields = bidFields;
    const displayValue = (field) => {
        const value = bid?.[field];
        if (value === undefined || value === null || value === '') return 'Not provided';
        return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    };

    return (
        <div className="frame_home bid_details_page">
        <div className = 'nav_bar'>
            <img
                className="bison_logo_nav" src={navLogo} alt="Bison"
              
            />
            <div className='nav_links'>
                <div className='bids_box_selected'>
                  <p className='nav_bar_text'>Bids</p>
                </div>
                <div className='history_box'>
                  <a className='nav_bar_text' href='/History' style={{ textDecoration: 'none' }}>History</a>
                </div>
                <div className='inspector_box'>
                  <a className='nav_bar_text' href='/Inspector' style={{ textDecoration: 'none' }}>Inspector</a>
                </div>
                <div className='clients_box'>
                  <a className='nav_bar_text' href='/Clients' style={{ textDecoration: 'none' }}>Clients</a>
                </div>
                <div className='reports_box'>
                  <a className='nav_bar_text' href='/Reports' style={{ textDecoration: 'none' }}>Reports</a>
                </div>
                <div className='messaging'>
                  <a className='nav_bar_text' href='/Messaging' style={{ textDecoration: 'none' }}>Messaging</a>
                </div>
            </div>
            <button type="button" className='burger_icon_position' aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                <div className = 'burger_icon_frame'>
                    <div className = 'top_bun'></div>
                    <div className = 'patty'></div>
                    <div className = 'bottom_bun'></div>
                </div>
            </button>
            {menuOpen && (
                <div className="hamburger_dropdown">
                    <button
                        className="logout_button"
                        onClick={() => {
                            window.location.href = "/";
                        }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
        <header className="bid_page_header">
        <div className="bid_details_toolbar">
        <button type="button" className="bid_back_button" onClick={() => {
            window.location.href = '/Homepage';
        }}>
            <span className="bid_back_icon" aria-hidden="true">←</span> Back
        </button>
        <h1 className='bidspage_header'>
            Bid Information
        </h1>
        <button type="button" className="bid_add_button" onClick={() => { window.location.href = '/AddBid'; }}>
            <span className="bid_back_icon" aria-hidden="true">+</span> Add
        </button>
        </div>
        </header>
        <div className="bid_information_layout">
            <aside className="bid_information_sidebar" aria-label="Bid selection">
                <h2>Bids <span>{availableBids.length}</span></h2>
                <ul>{availableBids.map((item) => <li key={item.id}><button type="button" disabled={!!editDraft} aria-pressed={bid?.id === item.id} onClick={() => selectBid(item.id)}>{item.name}<small>Bid #{item.id}</small></button></li>)}</ul>
                {!availableBids.length && <p>No bids available.</p>}
            </aside>
            <div className="bid_information_content">
                {bid && <div className="bid_inline_controls">{editDraft ? <><span>Editing bid information</span><button type="button" className="bid_back_button" onClick={() => { setEditDraft(null); setNotice(''); }}>Cancel</button><button type="submit" form="bid-inline-edit" className="bid_back_button" disabled={!editDraft.name?.trim()}>Save Changes</button></> : <button type="button" className="bid_back_button" onClick={() => { setEditDraft({ ...bid }); setNotice(''); }}>Edit</button>}</div>}
        <main className="fieldsframe" aria-label="Bid details">
            {createdBidId === String(bid?.id) && <p className="bid_creation_message" role="status">Bid has been created.</p>}
            {notice && <p className="bid_creation_message" role="status">{notice}</p>}
            {!bid && <p className="bid_details_empty">Select a bid from the sidebar to view its information.</p>}
            <form id="bid-inline-edit" className="bid_inline_form" onSubmit={saveEdits}>
            {fields.map(([field, label]) => (
                <div className="bid_detail_field" key={field}>
                    <label htmlFor={`view-${field}`}>{label}</label>
                    {editDraft && field === 'rush' ? <select id={`view-${field}`} value={String(editDraft.rush ?? false)} onChange={(event) => setEditDraft({ ...editDraft, rush: event.target.value === 'true' })}><option value="true">Yes</option><option value="false">No</option></select>
                        : <input id={`view-${field}`} type={editDraft && field === 'subjectContactEmail' ? 'email' : editDraft && field === 'subjectContactPhone' ? 'tel' : 'text'} readOnly={!editDraft || field === 'status'} required={!!editDraft && field === 'name'}
                            value={editDraft && field !== 'status' ? editDraft[field] ?? '' : displayValue(field)}
                            onChange={(event) => setEditDraft({ ...editDraft, [field]: event.target.value })} />}
                </div>
            ))}
            </form>
            <div className="bid_decision_actions">
                <span role="status">{bid ? `Status: ${bid.status}` : 'Select a bid to accept or decline.'}</span>
                <button type="button" className="bid_decline_button" disabled={!!editDraft || !bid || bid.status === 'Declined'} onClick={() => updateStatus('Declined')}>Decline</button>
                <button type="button" className="bid_accept_button" disabled={!!editDraft || !bid || bid.status === 'Accepted'} onClick={() => updateStatus('Accepted')}>Accept</button>
            </div>
        </main>
            </div>
        </div>
        <footer className="bid_page_footer" />
        </div>
    );
}

export default Bidspage;
