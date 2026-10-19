import { useEffect, useState } from 'react';
import { bidFields, readBidEdits, readBidList } from './bidFields';
import { getInspectors } from './inspectorSelection';
import { moveBidToJobs } from './bidTransfers';
import { downloadAgreement, readAgreement } from './engagementAgreement';
import './Bidspage.css';

function Bidspage({ onChange }) {
    const [editDraft, setEditDraft] = useState(null);
    const [notice, setNotice] = useState('');
    const [downloadingAgreement, setDownloadingAgreement] = useState(false);
    const downloadSavedAgreement = async () => {
        setDownloadingAgreement(true);
        try {
            const blob = await readAgreement(bid.referenceNumber);
            if (!blob) throw new Error('Missing agreement');
            downloadAgreement(blob, bid.engagementAgreement);
        } catch {
            setNotice('Unable to download the saved engagement agreement from this browser.');
        } finally { setDownloadingAgreement(false); }
    };
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
            const requestedId = window.location.pathname === '/Bidspage' ? new URLSearchParams(window.location.search).get('bidId') : null;
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
            onChange?.(updated);
            setNotice('Bid information has been saved.');
        } catch { setNotice('Unable to save changes. Please try again.'); }
    };
    const inspectors = getInspectors();
    const assignedInspector = inspectors.find((entry) => String(entry.id) === String(bid?.inspectorId)
        || (!bid?.inspectorId && entry.name === bid?.inspector));
    const assignInspector = (id) => {
        if (!bid || editDraft) return;
        const inspector = inspectors.find((entry) => String(entry.id) === id);
        const updated = { ...bid, inspectorId: inspector?.id ?? '', inspector: inspector?.name ?? '' };
        const updatedBids = availableBids.map((entry) => entry.id === bid.id ? updated : entry);
        sessionStorage.setItem('selectedBid', JSON.stringify(updated));
        sessionStorage.setItem('availableBids', JSON.stringify(updatedBids));
        sessionStorage.setItem('createdBids', JSON.stringify(readBidList('createdBids').map((entry) => entry.id === bid.id ? updated : entry)));
        setBid(updated);
        setAvailableBids(updatedBids);
        onChange?.(updated);
    };
    const updateStatus = (status) => {
        if (!bid) return;
        const updated = { ...bid, status };
        if (status === 'Accepted') {
            if (!assignedInspector) { setNotice('Assign an inspector before accepting this bid.'); return; }
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
        onChange?.(updated);
    };
    const fields = bidFields;
    const displayValue = (field) => {
        const value = bid?.[field];
        if (value === undefined || value === null || value === '') return 'Not provided';
        return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    };

    return (
        <div className="bid_details_popup_content">
        <div className="bid_information_layout">
            <div className="bid_information_content">
                {bid?.engagementAgreement && <button type="button" className="bid_back_button" disabled={downloadingAgreement} onClick={downloadSavedAgreement}>{downloadingAgreement ? 'Loading agreement…' : 'Download Engagement Agreement'}</button>}
                {bid && <div className="bid_inline_controls">{editDraft ? <><span>Editing bid information</span><button type="button" className="bid_back_button" onClick={() => { setEditDraft(null); setNotice(''); }}>Cancel</button><button type="submit" form="bid-inline-edit" className="bid_back_button" disabled={!editDraft.name?.trim()}>Save Changes</button></> : <button type="button" className="bid_back_button" onClick={() => { setEditDraft({ ...bid }); setNotice(''); }}>Edit</button>}</div>}
        <main className="fieldsframe" aria-label="Bid details">
            {createdBidId === String(bid?.id) && <p className="bid_creation_message" role="status">Bid has been created.</p>}
            {notice && <p className="bid_creation_message" role="status">{notice}</p>}
            {!bid && <p className="bid_details_empty">Select a bid from the bids homepage to view its information.</p>}
            <form id="bid-inline-edit" className="bid_inline_form" onSubmit={saveEdits}>
            {fields.map(([field, label, inputType = 'text']) => (
                <div className="bid_detail_field" key={field}>
                    <label htmlFor={`view-${field}`}>{label}</label>
                    {editDraft && field === 'rush' ? <select id={`view-${field}`} value={String(editDraft.rush ?? false)} onChange={(event) => setEditDraft({ ...editDraft, rush: event.target.value === 'true' })}><option value="true">Yes</option><option value="false">No</option></select>
                        : <input id={`view-${field}`} type={editDraft && field === 'subjectContactEmail' ? 'email' : editDraft && field === 'subjectContactPhone' ? 'tel' : editDraft ? inputType : 'text'} readOnly={!editDraft || field === 'status'} required={!!editDraft && field === 'name'}
                            min={inputType === 'number' ? 0 : undefined}
                            step={inputType === 'number' ? (field === 'completionDays' ? 1 : 0.01) : undefined}
                            value={editDraft && field !== 'status' ? editDraft[field] ?? '' : displayValue(field)}
                            onChange={(event) => setEditDraft({ ...editDraft, [field]: event.target.value })} />}
                </div>
            ))}
            </form>
            {bid && <div className="bid_detail_field">
                <label htmlFor="bid-inspector">Assigned inspector</label>
                <select id="bid-inspector" value={assignedInspector?.id ?? ''} disabled={!!editDraft} onChange={(event) => assignInspector(event.target.value)} aria-describedby="bid-inspector-help">
                    <option value="">Select an inspector</option>
                    {inspectors.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
                {!assignedInspector && <p id="bid-inspector-help">Assign an inspector before accepting this bid.</p>}
            </div>}
            <div className="bid_decision_actions">
                <span role="status">{bid ? `Status: ${bid.status}` : 'Select a bid to accept or decline.'}</span>
                <button type="button" className="bid_decline_button" disabled={!!editDraft || !bid || bid.status === 'Declined'} onClick={() => updateStatus('Declined')}>Decline</button>
                <button type="button" className="bid_accept_button" disabled={!!editDraft || !bid || !assignedInspector || bid.status === 'Accepted'} onClick={() => updateStatus('Accepted')}>Accept</button>
            </div>
        </main>
            </div>
        </div>
        </div>
    );
}

export default Bidspage;
