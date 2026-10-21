import { readBidList } from './bidFields';

export const JOB_STATUSES = ['Assigned', 'In-Progress', 'Pending Review', 'Submitted to Client', 'Unassigned'];
export function readJobStatuses() {
    try { return JSON.parse(sessionStorage.getItem('jobStatuses') || '{}') || {}; } catch { return {}; }
}
export function saveJobStatus(job, status) {
    if (!JOB_STATUSES.includes(status)) return job;
    const updated = { ...job, status };
    sessionStorage.setItem('jobStatuses', JSON.stringify({ ...readJobStatuses(), [job.id]: status }));
    for (const key of ['availableJobs', 'acceptedJobs', 'createdJobs']) {
        sessionStorage.setItem(key, JSON.stringify(readBidList(key).map((entry) => String(entry.id) === String(job.id) ? { ...entry, status } : entry)));
    }
    try {
        if (String(JSON.parse(sessionStorage.getItem('selectedJob'))?.id) === String(job.id)) sessionStorage.setItem('selectedJob', JSON.stringify(updated));
    } catch { /* No selected job. */ }
    return updated;
}
