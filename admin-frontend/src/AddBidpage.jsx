import { useState } from 'react';
import { bidFields, createBid } from './bidFields';
import { moveBidToJobs } from './bidTransfers';
import './AddBidpage.css';
import navLogo from './bison_logo_nav.png';

function AddBidpage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [draft, setDraft] = useState(() => Object.fromEntries(bidFields.map(([field]) => [field, field === 'status' ? 'Pending' : ''])));
    const [error, setError] = useState('');
    const handleAdd = (event) => {
        event.preventDefault();
        if (!draft.name.trim() || !draft.businessName.trim() || !draft.date.trim()) {
            setError('Enter a contact name, business name, and inspection request date.');
            return;
        }
        const bid = createBid(Object.fromEntries(Object.entries(draft).map(([field, value]) => [field, value.trim()])));
        if (bid.status === 'Accepted') {
            const acceptedJob = moveBidToJobs(bid);
            sessionStorage.removeItem('selectedBid');
            window.location.href = `/Jobspage?jobId=${encodeURIComponent(acceptedJob.id)}`;
        } else {
            window.location.href = `/Bidspage?bidId=${encodeURIComponent(bid.id)}`;
        }
    };

    return (
        <div className="frame_home bid_details_page add_bid_page">
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
                    window.location.href = sessionStorage.getItem('selectedBid') ? '/Bidspage' : '/Homepage';
                }}><span className="bid_back_icon" aria-hidden="true">←</span> Back</button>
                <h1 className="bidspage_header">Add Bid</h1>
            </div>
        </header>
        <main>
            <form className="fieldsframe" onSubmit={handleAdd} aria-label="Add bid">
                {bidFields.map(([field, label]) => (
                    <div className="bid_detail_field" key={field}>
                        <label htmlFor={`add-${field}`}>{label}</label>
                        <input id={`add-${field}`} name={field} type="text"
                            value={draft[field]} placeholder={field === 'date' ? 'MM/DD/YYYY' : `Enter ${label.toLowerCase()}`}
                            required={['name', 'businessName', 'date'].includes(field)}
                            onChange={(event) => { setDraft((previous) => ({ ...previous, [field]: event.target.value })); setError(''); }} />
                    </div>
                ))}
                {error && <p className="add_bid_error" role="alert">{error}</p>}
                <div className="bid_decision_actions">
                    <button type="submit" className="bid_accept_button">+ Add Bid</button>
                </div>
            </form>
        </main>
        <footer className="bid_page_footer" />
        </div>
    );
}

export default AddBidpage;
