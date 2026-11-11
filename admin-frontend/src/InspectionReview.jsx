import { useEffect, useState } from 'react';


export default function InspectionReview({ job, busy, onRequestChanges }) {
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    useEffect(() => { setNotes(job.reviewNotes || ''); setError(''); }, [job.id, job.reviewNotes]);
    const pending = job.status === 'Pending Review';
    const requestChanges = async () => {
        if (!notes.trim()) { setError('Describe the changes the inspector needs to make.'); return; }
        setError('');
        try { await onRequestChanges(notes.trim()); }
        catch (error) { setError(error.message); }
    };
    if (!pending && !job.reviewNotes) return null;
    return <section className="job_inspection_review" aria-label="Inspection review">
        {pending ? <div className="job_review_feedback">
            <label htmlFor="job-review-notes">Changes needed</label>
            <textarea id="job-review-notes" rows={3} maxLength={4000} value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} placeholder="Tell the inspector what needs to be corrected." />
            {error && <p className="add_bid_error" role="alert">{error}</p>}
            <button type="button" className="bid_form_cancel" disabled={busy} onClick={requestChanges}>Request changes</button>
        </div> : job.reviewNotes && <p className="job_review_note"><strong>Review feedback:</strong> {job.reviewNotes}</p>}
    </section>;
}
