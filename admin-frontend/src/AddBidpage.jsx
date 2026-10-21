import { getInspectors } from './inspectorSelection';
import { bidSections as sections, getBidSections } from './bidSections';
import { useEffect, useRef, useState } from 'react';
import { bidReferenceNumber, calculateTotalBid, createBid, nextBidId } from './bidFields';
import { BUSINESS_VALUATION, MACHINERY_EQUIPMENT, deleteAgreement, downloadAgreement, generateEngagementAgreement, saveAgreement } from './engagementAgreement';
import './AddBidpage.css';
import { businessValuationEmail, machineryEquipmentEmail, bidEmailLink } from './bidEmail';
import navLogo from './bison_logo_nav.png';


function AddBidpage() {
    const inspectors = getInspectors();
    const [inspectorId, setInspectorId] = useState('');
    const assignedInspector = inspectors.find((inspector) => String(inspector.id) === inspectorId);
    const [menuOpen, setMenuOpen] = useState(false);
    const [draft, setDraft] = useState(() => ({ date: '', ...Object.fromEntries(sections.flatMap(([, fields]) => fields.map(([field, , type]) => [field, field === 'status' ? 'Pending' : type === 'checkbox' ? false : '']))) }));
    const [error, setError] = useState('');
    const confirmDialog = useRef(null);
    const creating = useRef(false);
    const [generating, setGenerating] = useState(false);
    const [completedAgreement, setCompletedAgreement] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewFilename, setPreviewFilename] = useState('');
    const [previewing, setPreviewing] = useState(false);
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
    const [emailDraft, setEmailDraft] = useState(null);
    const [agreementError, setAgreementError] = useState('');
    const isMachinery = draft.appraisalType === MACHINERY_EQUIPMENT;
    const visibleSections = getBidSections(draft.appraisalType).map(([title, fields]) => [title,
        title === 'Appraisal Details' ? fields.filter(([field]) => field !== 'rush')
            : title === 'Pricing' ? fields.flatMap((entry) => entry[0] === 'rushDiscount' ? [['rush', 'Rush', 'checkbox'], entry] : [entry])
                : fields,
    ]);
    const visibleFields = new Set(visibleSections.flatMap(([, fields]) => fields.map(([field]) => field)));
    const submissionDraft = { ...(isMachinery ? Object.fromEntries(Object.entries(draft).filter(([field]) => visibleFields.has(field))) : draft), inspectorId: assignedInspector?.id ?? '', inspector: assignedInspector?.name ?? '' };
    const totalBid = calculateTotalBid(submissionDraft);
    const referenceNumber = bidReferenceNumber(nextBidId());
    const handleAdd = (event) => {
        event.preventDefault();
        if (!assignedInspector) { setError('Assign an inspector before creating this bid.'); return; }
        if (!draft.name.trim() || !draft.businessName.trim()) {
            setError('Enter a contact name and business name.');
            return;
        }
        if (draft.appraisalType === BUSINESS_VALUATION || isMachinery) {
            setAgreementError('');
            setPreviewUrl('');
            setEmailDraft((isMachinery ? machineryEquipmentEmail : businessValuationEmail)({ ...submissionDraft, referenceNumber }));
            confirmDialog.current.showModal();
            return;
        }
        createBid({
            ...Object.fromEntries(Object.entries(submissionDraft).map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value])),
            totalBid,
            date: submissionDraft.date || new Date().toLocaleDateString('en-US'),
        });
        sessionStorage.removeItem('createdBidMessage');
        window.location.href = '/Homepage';
    };

    const closeConfirmation = () => {
        if (generating) return;
        if (completedAgreement) {
            window.location.href = '/Bidspage';
            return;
        }
        confirmDialog.current.close();
    };

    const previewAgreement = async () => {
        if (previewing || generating) return;
        setPreviewing(true);
        setAgreementError('');
        try {
            const values = {
                ...Object.fromEntries(Object.entries(submissionDraft).map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value])),
                referenceNumber: bidReferenceNumber(nextBidId()),
                date: isMachinery && submissionDraft.date ? submissionDraft.date : new Date().toLocaleDateString('en-US'),
            };
            const blob = await generateEngagementAgreement(values);
            setPreviewUrl(URL.createObjectURL(blob));
            setPreviewFilename(`${values.referenceNumber}-engagement-agreement.pdf`);
        } catch {
            setAgreementError('Unable to preview the agreement. Please try again.');
        } finally { setPreviewing(false); }
    };

    const confirmAgreement = async () => {
        if (creating.current) return;
        creating.current = true;
        setGenerating(true);
        setAgreementError('');
        const values = {
            ...Object.fromEntries(Object.entries(submissionDraft).map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value])),
            referenceNumber: bidReferenceNumber(nextBidId()),
            date: isMachinery && submissionDraft.date ? submissionDraft.date : new Date().toLocaleDateString('en-US'),
        };
        let stored = false;
        try {
            const blob = await generateEngagementAgreement(values);
            await saveAgreement(values.referenceNumber, blob);
            stored = true;
            const filename = `${values.referenceNumber}-engagement-agreement.pdf`;
            createBid({ ...values, engagementAgreement: filename });
            sessionStorage.removeItem('createdBidMessage');
            setCompletedAgreement({ blob, filename });
        } catch {
            if (stored) await deleteAgreement(values.referenceNumber).catch(() => {});
            setAgreementError('Unable to create the bid and agreement. Your form is still here. Please try again.');
        } finally {
            creating.current = false;
            setGenerating(false);
        }
    };

    const openClientEmail = (event) => {
        event.preventDefault();
        if (!completedAgreement || !emailDraft) return;
        window.location.href = bidEmailLink(emailDraft);
    };

    const downloadCompletedAgreement = () => {
        try { downloadAgreement(completedAgreement.blob, completedAgreement.filename); }
        catch { setAgreementError('Unable to download the agreement. Please try again.'); }
    };

    return (
        <div className="frame_home bid_details_page add_bid_page">
        <dialog ref={confirmDialog} className="popup confirm_popup agreement_dialog" aria-labelledby="agreement-confirm-title" onCancel={(event) => {
            event.preventDefault();
            closeConfirmation();
        }}>
            <div className="confirm_body">
                <div className="agreement_dialog_heading">
                <h2 id="agreement-confirm-title">{completedAgreement ? 'Bid and agreement created' : isMachinery ? 'Confirm Machinery & Equipment bid?' : 'Confirm Business Valuation bid?'}</h2>
                <button type="button" className="bid_form_close" aria-label="Close popup" disabled={generating} onClick={closeConfirmation}>×</button>
                </div>
                {completedAgreement ? <p>Your bid is Pending. Download the filled engagement agreement below.</p> : <p>Create this bid and fill the Bison Valuation engagement agreement with its business, contact, report, pricing, and reference details?</p>}
                <p>Signatures and details not provided in the form will remain blank for completion.</p>
                {!isMachinery && draft.pdfOnly && Number(draft.discount) !== 100 && <p>The supplied agreement specifies a $100 PDF-only discount. Your entered discount is {`$${Number(draft.discount || 0).toFixed(2)}`}; review this before confirming.</p>}
                {emailDraft && <form id="bv-client-email" className="bid_email_preview" onSubmit={openClientEmail}>
                    <h3>Email to client</h3>
                    <label htmlFor="bid-email-to">To</label>
                    <input id="bid-email-to" type="email" required value={emailDraft.to} disabled={generating} onChange={(event) => setEmailDraft({ ...emailDraft, to: event.target.value })} />
                    <label htmlFor="bid-email-subject">Subject</label>
                    <input id="bid-email-subject" required value={emailDraft.subject} disabled={generating} onChange={(event) => setEmailDraft({ ...emailDraft, subject: event.target.value })} />
                    <label htmlFor="bid-email-body">Message</label>
                    <textarea id="bid-email-body" required rows={12} value={emailDraft.body} disabled={generating} onChange={(event) => setEmailDraft({ ...emailDraft, body: event.target.value })} />
                    <p>Review the message and fill any bracketed details. After creating the bid, open it in your email app to send. Download and attach the engagement agreement there.</p>
                </form>}
                {previewUrl && <div>
                    <iframe title="Engagement agreement PDF preview" src={previewUrl} className="agreement_pdf_preview" />
                    <a className="bid_back_button agreement_preview_download" href={previewUrl} download={previewFilename}>Download Preview PDF</a>
                </div>}
                {agreementError && <p role="alert" className="add_bid_error">{agreementError}</p>}
                {generating && <p role="status">Creating engagement agreement…</p>}
            </div>
            <div className="actions">
                {completedAgreement ? <><button type="button" className="bid_form_cancel" onClick={() => { window.location.href = '/Homepage'; }}>View Bids</button><button type="button" className="bid_accept_button" onClick={downloadCompletedAgreement}>Download Agreement PDF</button>{emailDraft && <button type="submit" form="bv-client-email" className="bid_accept_button">Open Email to Client</button>}</> : <><button type="button" className="bid_form_cancel" disabled={generating} onClick={() => confirmDialog.current.close()}>Cancel</button><button type="button" className="bid_accept_button" disabled={generating || previewing} onClick={confirmAgreement}>{generating ? 'Creating…' : 'Confirm & Create'}</button><button type="button" className="bid_form_cancel" disabled={generating || previewing} onClick={previewAgreement}>{previewing ? 'Preparing PDF…' : 'View PDF'}</button></>}
            </div>
        </dialog>
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
                    window.location.href = new URLSearchParams(window.location.search).get('from') === 'Bidspage' ? '/Bidspage' : '/Homepage';
                }}><span className="bid_back_icon" aria-hidden="true">←</span> Back</button>
                <h1 className="bidspage_header">Add Bid</h1>
            </div>
        </header>
        <main>
            <form className="fieldsframe" onSubmit={handleAdd} aria-label="Add bid">
                <fieldset className="add_bid_section add_bid_assignment">
                    <legend>Assign Inspector</legend>
                    <div className="bid_detail_field">
                        <label htmlFor="add-inspector">Assigned inspector (required)</label>
                        <select id="add-inspector" name="inspectorId" required value={inspectorId} onChange={(event) => { setInspectorId(event.target.value); setError(''); }}>
                            <option value="">Select an inspector</option>
                            {inspectors.map((inspector) => <option key={inspector.id} value={inspector.id}>{inspector.name}</option>)}
                        </select>
                    </div>
                    <p className="add_bid_pricing_help">Assign the inspector responsible for this bid before creating it.</p>
                </fieldset>
                {visibleSections.map(([title, fields]) => (
                    <fieldset className="add_bid_section" key={title}>
                        <legend>{title}</legend>
                        <div className="add_bid_section_fields">
                            {fields.map(([field, label, type = 'text']) => (
                                <div className={`bid_detail_field add_bid_${field}${type === 'checkbox' ? ' add_bid_checkbox' : ''}`} key={field}>
                                    <label htmlFor={`add-${field}`}>{label}</label>
                                    {type === 'appraisalType' ? (
                                        <select id={`add-${field}`} name={field} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value, reportFormat: '' })}>
                                            <option value="">Select appraisal type</option>
                                            <option value="Business Valuation (BV)">Business Valuation (BV)</option>
                                            <option value="Machinery & Equipment (M&E)">Machinery &amp; Equipment (M&amp;E)</option>
                                        </select>
                                    ) : field === 'reportFormat' && draft.appraisalType === 'Machinery & Equipment (M&E)' ? (
                                        <select id={`add-${field}`} name={field} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}>
                                            <option value="">Select report format</option>
                                            <option value="Onsite">Onsite</option>
                                            <option value="Desktop">Desktop</option>
                                        </select>
                                    ) : type === 'status' || field === 'referenceNumber' ? (
                                        <input id={`add-${field}`} name={field} value={field === 'status' ? 'Pending' : referenceNumber} readOnly />
                                    ) : type === 'total' ? (
                                        <input id={`add-${field}`} name={field} value={totalBid} readOnly aria-describedby="total-bid-help" />
                                    ) : (
                                        <input id={`add-${field}`} name={field} type={type}
                                            min={type === 'number' ? 0 : undefined}
                                            step={type === 'number' ? (field === 'completionDays' ? 1 : 0.01) : undefined}
                                            value={type === 'checkbox' ? undefined : draft[field]}
                                            checked={type === 'checkbox' ? draft[field] : undefined}
                                            placeholder={type !== 'checkbox' ? `Enter ${label.toLowerCase()}` : undefined}
                                            required={['name', 'businessName'].includes(field)}
                                            disabled={(field === 'rushDiscount' && !draft.rush) || (field === 'discount' && !draft.pdfOnly)}
                                            onChange={(event) => {
                                                setDraft((previous) => ({ ...previous, [field]: type === 'checkbox' ? event.target.checked : event.target.value }));
                                                setError('');
                                            }} />
                                    )}
                                </div>
                            ))}
                        </div>
                        {title === 'Pricing' && !isMachinery && <p id="total-bid-help" className="add_bid_pricing_help">Total Bid = Appraisal Fee − Discount − Rush Discount + Additional Charges. Enter discounts as amounts. Rush Discount applies only when Rush is checked.</p>}
                    </fieldset>
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
