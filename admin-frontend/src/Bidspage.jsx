import { useState } from 'react';
import { bidFields } from './bidFields';
import { moveBidToJobs } from './bidTransfers';
import './Bidspage.css';
import navLogo from './bison_logo_nav.png';

function Bidspage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [bid, setBid] = useState(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem('selectedBid') || 'null');
            const requestedId = new URLSearchParams(window.location.search).get('bidId');
            return saved && saved.status !== 'Accepted' && (!requestedId || String(saved.id) === requestedId) ? saved : null;
        } catch {
            return null;
        }
    });
    const [availableBids, setAvailableBids] = useState(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem('availableBids') || '[]');
            return Array.isArray(saved) && saved.length ? saved.filter((item) => item.status !== 'Accepted') : (bid ? [bid] : []);
        } catch {
            return bid ? [bid] : [];
        }
    });
    const selectBid = (event) => {
        const selected = availableBids.find((item) => String(item.id) === event.target.value);
        if (!selected) return;
        setBid(selected);
        sessionStorage.setItem('selectedBid', JSON.stringify(selected));
        window.history.replaceState(null, '', `/Bidspage?bidId=${encodeURIComponent(selected.id)}`);
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
                  <p className='nav_bar_text'>History</p>
                </div>
                <div className='inspector_box'>
                  <p className='nav_bar_text'>Inspector</p>
                </div>
                <div className='clients_box'>
                  <p className='nav_bar_text'>Clients</p>
                </div>
                <div className='reports_box'>
                  <p className='nav_bar_text'>Reports</p>
                </div>
                <div className='messaging'>
                  <p className='nav_bar_text'>Messaging</p>
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
        <main className="fieldsframe" aria-label="Bid details">
            <div className="bid_selector">
                <label htmlFor="bid-selector">Bids</label>
                <select id="bid-selector" value={bid ? String(bid.id) : ''} onChange={selectBid} disabled={!availableBids.length}>
                    <option value="" disabled>Select a bid</option>
                    {availableBids.map((item) => (
                        <option key={item.id} value={String(item.id)}>{item.name}</option>
                    ))}
                </select>
            </div>
            {!bid && <p className="bid_details_empty">Select View on a bid from the Bids page to see its information.</p>}
            {fields.map(([field, label]) => (
                <div className="bid_detail_field" key={field}>
                    <label htmlFor={`view-${field}`}>{label}</label>
                    <input id={`view-${field}`} type="text" readOnly
                        value={displayValue(field)}
                        aria-label={`${label}: ${displayValue(field)}`} />
                </div>
            ))}
            <div className="bid_decision_actions">
                <span role="status">{bid ? `Status: ${bid.status}` : 'Select a bid to accept or decline.'}</span>
                <button type="button" className="bid_decline_button" disabled={!bid || bid.status === 'Declined'} onClick={() => updateStatus('Declined')}>Decline</button>
                <button type="button" className="bid_accept_button" disabled={!bid || bid.status === 'Accepted'} onClick={() => updateStatus('Accepted')}>Accept</button>
            </div>
        </main>
        <footer className="bid_page_footer" />
        </div>
    );
}

export default Bidspage;
