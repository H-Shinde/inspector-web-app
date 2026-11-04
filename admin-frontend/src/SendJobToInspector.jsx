import ValidatedForm from './ValidatedForm';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { getInspectors } from './inspectorSelection';
import { generateInspectionRequest, inspectorJobEmail } from './inspectionRequest';
import { bidEmailLink } from './bidEmail';
import { downloadAgreement } from './engagementAgreement';
import './AddBidpage.css';

export default function SendJobToInspector({ job, sections, className = 'bid_back_button', hideButton = false, openRequest = 0 }) {
    const [email, setEmail] = useState(null);
    const [pdf, setPdf] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const dialog = useRef(null);
    const generation = useRef(0);
    // Assignment names are authoritative; an old inspectorId can survive reassignment.
    const inspector = job?.inspector ? (job.sourceBidBackend === 'django' && (!job.inspectorEmailFor || job.inspectorEmailFor === job.inspector)
        ? { name: job.inspector, email: job.inspectorEmail || '' }
        : getInspectors().find((entry) => entry.name === job.inspector) || { name: job.inspector }) : null;
    useEffect(() => { if (email && !dialog.current.open) dialog.current.showModal(); }, [email]);
    useEffect(() => () => { if (pdf?.url) URL.revokeObjectURL(pdf.url); }, [pdf]);
    useEffect(() => () => { generation.current += 1; }, []);
    const close = () => {
        generation.current += 1;
        dialog.current.close(); setEmail(null); setPdf(null); setLoading(false);
    };
    const generate = async () => {
        const request = ++generation.current;
        setLoading(true); setError('');
        try {
            let details = sections;
            if (!details) {
                try { details = JSON.parse(sessionStorage.getItem('jobSectionDetails') || '{}')?.[job.id]; } catch { details = {}; }
            }
            const blob = await generateInspectionRequest(job, inspector, details);
            if (request !== generation.current) return;
            const reference = job.referenceNumber || `JOB-${String(job.id).padStart(6, '0')}`;
            setPdf({ blob, url: URL.createObjectURL(blob), filename: `${reference}-inspection-request.pdf` });
        } catch {
            if (request === generation.current) setError('Unable to generate the inspection request. Please try again.');
        } finally { if (request === generation.current) setLoading(false); }
    };
    const start = () => { setEmail(inspectorJobEmail(job, inspector)); setPdf(null); generate(); };
    // Lets a parent open the request (e.g. right after assigning); the initial 0 never fires.
    const lastOpenRequest = useRef(openRequest);
    useEffect(() => {
        if (openRequest === lastOpenRequest.current) return;
        lastOpenRequest.current = openRequest;
        if (inspector) start();
    }, [openRequest]);
    if (!inspector) return null;
    return <>
        {!hideButton && <button type="button" className={className} onClick={(event) => {
            event.stopPropagation(); start();
        }}>Send Job to Inspector</button>}
        {createPortal(<dialog ref={dialog} className="popup confirm_popup agreement_dialog" aria-labelledby={`inspector-request-title-${job.id}`}
            onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) close(); }}
            onCancel={(event) => { event.preventDefault(); close(); }}>
            {email && <>
                <div className="confirm_body">
                    <div className="agreement_dialog_heading"><h2 id={`inspector-request-title-${job.id}`}>Send Job to Inspector</h2><button type="button" className="bid_form_close" aria-label="Close inspector request" onClick={close}>×</button></div>
                    <p>Review the inspection request and email draft for {inspector.name}.</p>
                    <p>Details not provided remain blank in the PDF for completion.</p>
                    <ValidatedForm id={`inspector-request-email-${job.id}`} className="bid_email_preview" onSubmit={(event) => { event.preventDefault(); window.location.href = bidEmailLink(email); }}>
                        <h3>Email to inspector</h3>
                        <label htmlFor={`inspector-request-to-${job.id}`}>To</label><input id={`inspector-request-to-${job.id}`} type="email" required value={email.to} onChange={(event) => setEmail({ ...email, to: event.target.value })} />
                        <label htmlFor={`inspector-request-subject-${job.id}`}>Subject</label><input id={`inspector-request-subject-${job.id}`} required value={email.subject} onChange={(event) => setEmail({ ...email, subject: event.target.value })} />
                        <label htmlFor={`inspector-request-body-${job.id}`}>Message</label><textarea id={`inspector-request-body-${job.id}`} required rows={12} value={email.body} onChange={(event) => setEmail({ ...email, body: event.target.value })} />
                        <p>Review the message and fill any bracketed details. Download the inspection request and attach it in your email app before sending.</p>
                    </ValidatedForm>
                    {loading && <p role="status">Creating inspection request…</p>}
                    {error && <p role="alert" className="add_bid_error">{error}</p>}
                    {pdf && <iframe title="Inspection request PDF preview" className="agreement_pdf_preview" src={pdf.url} />}
                </div>
                <div className="actions">
                    <button type="button" className="bid_form_cancel" onClick={close}>Close</button>
                    {error && <button type="button" className="bid_form_cancel" disabled={loading} onClick={generate}>Retry PDF</button>}
                    <button type="button" className="bid_accept_button" disabled={!pdf || loading} onClick={() => {
                        try { downloadAgreement(pdf.blob, pdf.filename); } catch { setError('Unable to download the inspection request. Please try again.'); }
                    }}>Download Inspection Request</button>
                    <button type="submit" form={`inspector-request-email-${job.id}`} className="bid_accept_button" disabled={!pdf || loading}>Open Email to Inspector</button>
                </div>
            </>}
        </dialog>, document.body)}
    </>;
}