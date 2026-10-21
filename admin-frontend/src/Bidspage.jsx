import LogoutButton from './LogoutButton';
import { getBidSections } from './bidSections';
import { useEffect, useRef, useState } from 'react';
import { calculateTotalBid } from './bidFields';
import { getBid, listBidInspectors, updateBid, decideBid, readBidAgreement } from './bidsApi';
import { moveBidToJobs } from './bidTransfers';
import { downloadAgreement, generateEngagementAgreement } from './engagementAgreement';
import './Jobspage.css';
import './AddBidpage.css';
import { businessValuationEmail, machineryEquipmentEmail, bidEmailLink } from './bidEmail';
import { BUSINESS_VALUATION, MACHINERY_EQUIPMENT } from './engagementAgreement';
import navLogo from './bison_logo_nav.png';

const totalForBid = (values) => {
    const fields = new Set(getBidSections(values.appraisalType).flatMap(([, sectionFields]) => sectionFields.map(([field]) => field)));
    return calculateTotalBid(Object.fromEntries(Object.entries(values).filter(([field]) => fields.has(field))));
};

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
            const blob = await readBidAgreement(bid.id);
            if (!blob) throw new Error('Missing agreement');
            downloadAgreement(blob, bid.engagementAgreement);
        } catch {
            setNotice('Unable to download the saved agreement. Please try again.');
        } finally { setDownloadingAgreement(false); }
    };
    const [bid, setBid] = useState(null);
    const [inspectors, setInspectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        const id = new URLSearchParams(window.location.search).get('bidId');
        if (!id) { setLoading(false); return () => controller.abort(); }
        setLoading(true); setLoadError('');
        Promise.all([getBid(id, controller.signal), listBidInspectors(controller.signal)]).then(([record, rows]) => {
            if (!controller.signal.aborted) { setBid(record); setInspectors(rows); }
        }).catch((error) => { if (!controller.signal.aborted) setLoadError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [attempt]);
    const saveEdits = async (event) => {
        event.preventDefault();
        if (!editDraft?.name?.trim() || busy) return;
        setBusy(true); setNotice('');
        try {
            const updated = await updateBid(bid.id, { ...editDraft, name: editDraft.name.trim() });
            setBid(updated); setEditDraft(null); onChange?.(updated);
            setNotice('Bid information has been saved.');
        } catch (error) { setNotice(error.message); }
        finally { setBusy(false); }
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
    const emailValues = () => bid;
    const generateEmail = () => {
        if (!canGenerateEmail || editDraft) return;
        const values = emailValues();
        setEmailAgreement(null);
        setEmailDraft((bid.appraisalType === MACHINERY_EQUIPMENT ? machineryEquipmentEmail : businessValuationEmail)(values));
        generateEmailPdf(values);
    };
    const assignedInspector = inspectors.find((entry) => String(entry.id) === String(bid?.inspectorId))
        || (bid?.inspectorId ? { id: bid.inspectorId, name: bid.inspector } : null);
    const assignInspector = async (id) => {
        if (!bid || editDraft || busy) return;
        setBusy(true); setNotice('');
        try {
            const updated = await updateBid(bid.id, { ...bid, inspectorId: id });
            setBid(updated); onChange?.(updated);
        } catch (error) { setNotice(error.message); }
        finally { setBusy(false); }
    };
    const updateStatus = async (status) => {
        if (!bid || busy) return;
        setBusy(true); setNotice('');
        try {
            const updated = await decideBid(bid.id, status);
            setBid(updated); onChange?.(updated);
            if (status === 'Accepted') {
                const acceptedJob = moveBidToJobs({ ...updated, inspectorEmail: assignedInspector?.email || '', inspectorEmailFor: updated.inspector });
                window.location.href = `/Jobspage?jobId=${encodeURIComponent(acceptedJob.id)}`;
            } else { window.location.href = '/History'; }
        } catch (error) { setNotice(error.message); }
        finally { setBusy(false); }
    };
    const sections = getBidSections((editDraft || bid)?.appraisalType);
    const fields = sections.find(([title]) => title === activeSection)?.[1] || [];
    const changeField = (field, value) => {
        if (!bid) return;
        setNotice('');
        setEditDraft((previous) => ({ ...(previous || bid), [field]: value, ...(field === 'appraisalType' ? { reportFormat: '' } : {}) }));
    };
    const displayValue = (field) => {
        const value = field === 'totalBid' ? bid?.totalBid : bid?.[field];
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
            {menuOpen && <div className="hamburger_dropdown"><LogoutButton /></div>}
        </div>
        <header className="bid_page_header">
            <div className="bid_details_toolbar">
                <button type="button" className="bid_back_button" onClick={() => { window.location.href = '/Homepage'; }}><span className="bid_back_icon" aria-hidden="true">←</span> Back</button>
                <h1 className="bidspage_header">Bid Information</h1>
                {canGenerateEmail && <button type="button" className="bid_add_button" disabled={!!editDraft || busy} onClick={generateEmail}>Generate Email</button>}
            </div>
        </header>
        {loading && <p role="status" className="bid_load_message">Loading bid…</p>}
        {loadError && <p role="alert" className="bid_load_message">{loadError} <button type="button" className="bid_back_button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
        <div className="job_details_layout" aria-busy={loading}>
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

                {bid?.status === 'Pending' && <div className="bid_inline_controls">{editDraft ? <><span>Editing bid information</span><button type="button" className="bid_back_button" onClick={() => { setEditDraft(null); setNotice(''); }}>Cancel</button><button type="submit" form="bid-inline-edit" className="bid_back_button" disabled={!editDraft.name?.trim() || busy}>Save Changes</button></> : <button type="button" className="bid_back_button" onClick={() => { setEditDraft({ ...bid }); setNotice(''); }}>Edit</button>}</div>}
        <main className="fieldsframe" aria-label="Bid details">
            {notice && <p className="bid_creation_message" role="status">{notice}</p>}
            {!bid && <p className="bid_details_empty">Select a bid from the bids homepage to view its information.</p>}
            <form id="bid-inline-edit" className="bid_inline_form" onSubmit={saveEdits}>
            {fields.map(([field, label, inputType = 'text']) => (
                <div className="bid_detail_field" key={field}>
                    <label htmlFor={`view-${field}`}>{label}</label>
                    {inputType === 'appraisalType' ? <select id={`view-${field}`} disabled={!bid || busy || bid.status !== 'Pending'} value={(editDraft || bid)?.[field] ?? ''} onChange={(event) => changeField(field, event.target.value)}>
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
                <select id="bid-inspector" value={assignedInspector?.id ?? ''} disabled={!!editDraft || busy || bid.status !== 'Pending'} onChange={(event) => assignInspector(event.target.value)} aria-describedby="bid-inspector-help">
                    <option value="" disabled>Select an inspector</option>
                    {assignedInspector && !inspectors.some((entry) => entry.id === assignedInspector.id) && <option value={assignedInspector.id}>{assignedInspector.name}</option>}
                    {inspectors.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
                {!assignedInspector && <p id="bid-inspector-help">Assign an inspector before accepting this bid.</p>}
            </div>}
            <div className="bid_decision_actions">
                <span role="status">{bid ? `Status: ${bid.status}` : 'Select a bid to accept or decline.'}</span>
                <button type="button" className="bid_decline_button" disabled={!!editDraft || busy || !bid || bid.status !== 'Pending'} onClick={() => updateStatus('Declined')}>Decline</button>
                <button type="button" className="bid_accept_button" disabled={!!editDraft || busy || !bid || !assignedInspector || bid.status !== 'Pending'} onClick={() => updateStatus('Accepted')}>Accept</button>
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
