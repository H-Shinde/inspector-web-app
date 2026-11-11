export const JOB_STATUSES = ['Assigned', 'In-Progress', 'Pending Review', 'Needs Changes', 'Unassigned'];

export function restoreJobStatus(job) {
    return job.status === 'Submitted to Client' ? (job.inspector ? 'Assigned' : 'Unassigned') : job.status;
}
