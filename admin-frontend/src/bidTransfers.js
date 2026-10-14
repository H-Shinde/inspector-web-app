export function readAcceptedJobs() {
    try {
        const jobs = JSON.parse(sessionStorage.getItem('acceptedJobs') || '[]');
        return Array.isArray(jobs) ? jobs : [];
    } catch {
        return [];
    }
}

export function moveBidToJobs(bid) {
    const jobs = readAcceptedJobs();
    let createdJobs = [];
    try {
        const saved = JSON.parse(sessionStorage.getItem('createdJobs') || '[]');
        createdJobs = Array.isArray(saved) ? saved : [];
    } catch {}
    const existing = jobs.find((job) => job.sourceBidId === bid.id);
    const job = {
        ...bid,
        pdf: bid.pdf?.name ?? bid.pdf ?? '',
        id: existing?.id ?? Math.max(20, ...[...jobs, ...createdJobs].map((item) => Number(item.id))) + 1,
        sourceBidId: bid.id,
        status: 'Accepted',
    };
    sessionStorage.setItem('acceptedJobs', JSON.stringify([
        ...jobs.filter((item) => item.sourceBidId !== bid.id), job,
    ]));
    let statuses = {};
    try {
        statuses = JSON.parse(sessionStorage.getItem('bidStatuses') || '{}') || {};
    } catch {}
    sessionStorage.setItem('bidStatuses', JSON.stringify({ ...statuses, [bid.id]: 'Accepted' }));
    let available = [];
    try {
        const saved = JSON.parse(sessionStorage.getItem('availableJobs') || '[]');
        available = Array.isArray(saved) ? saved : [];
    } catch {}
    sessionStorage.setItem('availableJobs', JSON.stringify([...available.filter((item) => item.id !== job.id), job]));
    sessionStorage.setItem('selectedJob', JSON.stringify(job));
    sessionStorage.setItem('acceptedBidMessage', String(job.id));
    return job;
}
