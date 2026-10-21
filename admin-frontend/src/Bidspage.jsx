import { bidSections, getBidSections } from './bidSections';
import { useEffect, useRef, useState } from 'react';
import { bidReferenceNumber, calculateTotalBid, readBidEdits, readBidList } from './bidFields';
import { getInspectors } from './inspectorSelection';
import { moveBidToJobs } from './bidTransfers';
import { downloadAgreement, readAgreement, generateEngagementAgreement } from './engagementAgreement';
import './Jobspage.css';
import './AddBidpage.css';
import { businessValuationEmail, machineryEquipmentEmail, bidEmailLink } from './bidEmail';
import { BUSINESS_VALUATION, MACHINERY_EQUIPMENT } from './engagementAgreement';
import navLogo from './bison_logo_nav.png';

const totalForBid = (values) => {
    const fields = new Set(getBidSections(values.appraisalType).flatMap(([, sectionFields]) => sectionFields.map(([field]) => field)));
    return calculateTotalBid(Object.fromEntries(Object.entries(values).filter(([field]) => fields.has(field))));
};

const autofillBid = (bid) => ({
    ...bid,
    referenceNumber: bid.referenceNumber?.trim() || bidReferenceNumber(bid.id),
    status: bid.status || 'Pending',
    rush: bid.rush ?? false,
    pdfOnly: bid.pdfOnly ?? false,
});

function Bidspage({ onChange }) {
    const [emailDraft, setEmailDraft] = useState(null);
    const [emailAgreement, setEmailAgreement] = useState(null);
    const [generatingEmailPdf, setGeneratingEmailPdf] = useState(false);
    const [emailPdfError, setEmailPdfError] = useState('');
    const emailGeneration = useRef(0);
    const emailDialog = useRef(null);
    useEffect(() => () => { emailGeneration.current += 1; }, []);
    useEffect(() => () => { if (emailAgreement?.url) URL.revokeObjectURL(emailAgreement.url); }, [emailAgreement]);
    useEffect(() => { if (emailDraft && !emailDialog.current.open) emailDialog.current.showModal(); }, [emailDraft]);
    const closeEmail = () => { emailGeneration.current += 1; emailDialog.current.close(); setEmailDraft(null); setEmailAgreement(null); setGeneratingEmailPdf(false); };
    const [activeSection, setActiveSection] = useState('Appraisal');
    const [menuOpen, setMenuOpen] = useState(false);
    const [editDraft, setEditDraft] = useState(null);
    const [notice, setNotice] = useState('');
    const [downloadingAgreement, setDownloadingAgreement] = useState(false);
    const downloadSavedAgreement = async () => {
        setNotice('');
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
            return selected && selected.status !== 'Accepted' && (!requestedId || String(selected.id) === requestedId) ? autofillBid({ ...selected, ...readBidEdits()[selected.id] }) : null;
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
        const updated = autofillBid({ ...editDraft, name: editDraft.name.trim(), totalBid: totalForBid(editDraft) });
        const editableFields = [...bidSections.flatMap(([, fields]) => fields), ['date'], ['referenceNumber']];
        const edits = Object.fromEntries(editableFields.filter(([field]) => field !== 'status').map(([field]) => [field, updated[field] ?? '']));
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
    const canGenerateEmail = bid && [BUSINESS_VALUATION, MACHINERY_EQUIPMENT].includes(bid.appraisalType);
    const generateEmailPdf = async (values) => {
        const generation = ++emailGeneration.current;
        setGeneratingEmailPdf(true);
        setEmailPdfError('');
        try {
            const blob = await generateEngagementAgreement(values);
            if (generation !== emailGeneration.current) return;
            setEmailAgreement({ blob, url: URL.createObjectURL(blob), filename: `${values.referenceNumber}-engagement-agreement.pdf` });
        } catch {
            if (generation === emailGeneration.current) setEmailPdfError('Unable to generate the agreement. Please try again.');
        } finally {
            if (generation === emailGeneration.current) setGeneratingEmailPdf(false);
        }
    };
    const emailValues = () => ({ ...bid, referenceNumber: bid.referenceNumber || bidReferenceNumber(bid.id) });
    const generateEmail = () => {
        if (!canGenerateEmail || editDraft) return;
        const values = emailValues();
        setEmailAgreement(null);
        setEmailDraft((bid.appraisalType === MACHINERY_EQUIPMENT ? machineryEquipmentEmail : businessValuationEmail)(values));
        generateEmailPdf(values);
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
    const sections = getBidSections((editDraft || bid)?.appraisalType);
    const fields = sections.find(([title]) => title === activeSection)?.[1] || [];
    const changeField = (field, value) => {
        if (!bid) return;
        setNotice('');
        setEditDraft((previous) => ({ ...(previous || bid), [field]: value, ...(field === 'appraisalType' ? { reportFormat: '' } : {}) }));
    };
    const displayValue = (field) => {
        const value = field === 'totalBid' ? totalForBid(bid || {}) : bid?.[field];
        if (value === undefined || value === null || value === '') return 'Not provided';
        return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    };

    return (
        <div className="frame_home bid_details_page job_details_page bid_information_page">
        <div className="nav_bar">
            <img className="bison_logo_nav" src={navLogo} alt="Bison" />
            <div className="nav_links">
                <div className="bids_box_selected"><a className="nav_bar_text" href="/Homepage" style={{ textDecoration: 'none' }}>Bids</a></div>
                {['History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((page) => <div key={page}><a className="nav_bar_text" href={`/${page}`} style={{ textDecoration: 'none' }}>{page}</a></div>)}
            </div>
            <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
            </button>
            {menuOpen && <div className="hamburger_dropdown"><button className="logout_button" onClick={() => { window.location.href = '/'; }}>Logout</button></div>}
        </div>
        <header className="bid_page_header">
            <div className="bid_details_toolbar">
                <button type="button" className="bid_back_button" onClick={() => { window.location.href = '/Homepage'; }}><span className="bid_back_icon" aria-hidden="true">←</span> Back</button>
                <h1 className="bidspage_header">Bid Information</h1>
                {canGenerateEmail && <button type="button" className="bid_add_button" disabled={!!editDraft} onClick={generateEmail}>Generate Email</button>}
            </div>
        </header>
        <div className="job_details_layout">
            <aside className="job_sidebar" aria-label="Bid sections">
                {[...sections.map(([title]) => title), 'Documents'].map((section) => <button type="button" key={section}
                    className={activeSection === section ? 'active' : ''} aria-current={activeSection === section ? 'page' : undefined}
                    onClick={() => setActiveSection(section)}>{section}</button>)}
            </aside>
            <section className="job_details_content bid_information_content" aria-label={activeSection}>
                {activeSection === 'Documents' ? <div className="bid_documents">
                    <h2>Documents</h2>
                    {notice && <p role="status" className="job_empty">{notice}</p>}
                    {bid?.engagementAgreement ? <div className="bid_document_row">
                        <div><h3>Engagement Agreement</h3><p>{bid.engagementAgreement}</p></div>
                        <button type="button" className="bid_back_button" disabled={downloadingAgreement} onClick={downloadSavedAgreement}>{downloadingAgreement ? 'Loading agreement…' : 'Download PDF'}</button>
                    </div> : <p className="job_empty">No downloadable PDF is associated with this bid.</p>}
                </div> : <>

                {bid && <div className="bid_inline_controls">{editDraft ? <><span>Editing bid information</span><button type="button" className="bid_back_button" onClick={() => { setEditDraft(null); setNotice(''); }}>Cancel</button><button type="submit" form="bid-inline-edit" className="bid_back_button" disabled={!editDraft.name?.trim()}>Save Changes</button></> : <button type="button" className="bid_back_button" onClick={() => { setEditDraft({ ...bid }); setNotice(''); }}>Edit</button>}</div>}
        <main className="fieldsframe" aria-label="Bid details">
            {createdBidId === String(bid?.id) && <p className="bid_creation_message" role="status">Bid has been created.</p>}
            {notice && <p className="bid_creation_message" role="status">{notice}</p>}
            {!bid && <p className="bid_details_empty">Select a bid from the bids homepage to view its information.</p>}
            <form id="bid-inline-edit" className="bid_inline_form" onSubmit={saveEdits}>
            {fields.map(([field, label, inputType = 'text']) => (
                <div className="bid_detail_field" key={field}>
                    <label htmlFor={`view-${field}`}>{label}</label>
                    {inputType === 'appraisalType' ? <select id={`view-${field}`} disabled={!bid} value={(editDraft || bid)?.[field] ?? ''} onChange={(event) => changeField(field, event.target.value)}>
                        <option value="">Select appraisal type</option>
                        {(editDraft || bid)?.appraisalType && ![BUSINESS_VALUATION, MACHINERY_EQUIPMENT].includes((editDraft || bid).appraisalType) && <option>{(editDraft || bid).appraisalType}</option>}
                        <option>Business Valuation (BV)</option><option>Machinery &amp; Equipment (M&amp;E)</option>
                    </select> : editDraft && field === 'reportFormat' && editDraft.appraisalType === 'Machinery & Equipment (M&E)' ? <select id={`view-${field}`} value={editDraft[field] ?? ''} onChange={(event) => changeField(field, event.target.value)}>
                        <option value="">Select report format</option><option>Onsite</option><option>Desktop</option>
                    </select> : editDraft && inputType === 'checkbox' ? <input id={`view-${field}`} type="checkbox" checked={!!editDraft[field]} onChange={(event) => changeField(field, event.target.checked)} />
                        : <input id={`view-${field}`} type={editDraft && !['status', 'total', 'appraisalType'].includes(inputType) ? inputType : 'text'} readOnly={!editDraft || ['status', 'referenceNumber', 'totalBid'].includes(field)} required={!!editDraft && ['name', 'businessName'].includes(field)}
                            min={inputType === 'number' ? 0 : undefined}
                            step={inputType === 'number' ? (field === 'completionDays' ? 1 : 0.01) : undefined}
                            disabled={!!editDraft && ((field === 'rushDiscount' && !editDraft.rush) || (field === 'discount' && !editDraft.pdfOnly))}
                            value={editDraft ? field === 'totalBid' ? totalForBid(editDraft) : editDraft[field] ?? '' : displayValue(field)}
                            onChange={(event) => changeField(field, event.target.value)} />}

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
                </>}
            </section>
        </div>
        <dialog ref={emailDialog} className="popup confirm_popup agreement_dialog" aria-labelledby="bid-email-title"
            onCancel={(event) => { event.preventDefault(); closeEmail(); }}
            onClick={(event) => { if (event.target === event.currentTarget) closeEmail(); }}>
            {emailDraft && <>
                <div className="confirm_body">
                    <div className="agreement_dialog_heading"><h2 id="bid-email-title">Bid Email &amp; Agreement</h2><button type="button" className="bid_form_close" aria-label="Close email" onClick={closeEmail}>×</button></div>
                    <p>Download the filled engagement agreement below.</p>
                    <p>Signatures and details not provided in the form will remain blank for completion.</p>
                    <form id="bid-details-email" className="bid_email_preview" onSubmit={(event) => { event.preventDefault(); window.location.href = bidEmailLink(emailDraft); }}>
                        <h3>Email to client</h3>
                        <label htmlFor="bid-email-to">To</label><input id="bid-email-to" type="email" required value={emailDraft.to} onChange={(event) => setEmailDraft({ ...emailDraft, to: event.target.value })} />
                        <label htmlFor="bid-email-subject">Subject</label><input id="bid-email-subject" required value={emailDraft.subject} onChange={(event) => setEmailDraft({ ...emailDraft, subject: event.target.value })} />
                        <label htmlFor="bid-email-body">Message</label><textarea id="bid-email-body" required rows={12} value={emailDraft.body} onChange={(event) => setEmailDraft({ ...emailDraft, body: event.target.value })} />
                        <p>Review the message and fill any bracketed details. Open it in your email app to send. Download and attach the engagement agreement there.</p>
                    </form>
                    {generatingEmailPdf && <p role="status">Creating engagement agreement…</p>}
                    {emailPdfError && <p role="alert" className="add_bid_error">{emailPdfError}</p>}
                    {emailAgreement && <iframe title="Engagement agreement PDF preview" src={emailAgreement.url} className="agreement_pdf_preview" />}
                </div>
                <div className="actions">
                    <button type="button" className="bid_form_cancel" onClick={closeEmail}>Close</button>
                    {emailPdfError && <button type="button" className="bid_form_cancel" onClick={() => generateEmailPdf(emailValues())}>Retry PDF</button>}
                    <button type="button" className="bid_accept_button" disabled={!emailAgreement || generatingEmailPdf} onClick={() => {
                        try { downloadAgreement(emailAgreement.blob, emailAgreement.filename); }
                        catch { setEmailPdfError('Unable to download the agreement. Please try again.'); }
                    }}>Download Agreement PDF</button>
                    <button type="submit" form="bid-details-email" className="bid_accept_button">Open Email to Client</button>
                </div>
            </>}
        </dialog>
        <div className="bid_page_footer" />
        </div>
    );
}

export default Bidspage;
