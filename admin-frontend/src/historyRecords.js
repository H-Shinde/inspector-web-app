import { readBidList } from './bidFields';

export function isDeletedRecord(type, id) {
    return readBidList('deletedRecords').some((row) => row.recordType === type && String(row.id) === String(id));
}

export function isCompletedJob(id) {
    return readBidList('completedJobs').some((job) => String(job.id) === String(id));
}

export function completeJob(record) {
    if (isCompletedJob(record.id)) return readBidList('completedJobs').find((job) => String(job.id) === String(record.id));
    const readObject = (key) => {
        try { return JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch { return {}; }
    };
    const archived = {
        ...record, pdf: record.pdf?.name ?? record.pdf ?? '', recordType: 'Job',
        inspector: readBidList('jobAssignments').find((entry) => String(entry.jobId) === String(record.id))?.inspector ?? record.inspector,
        items: readObject('jobItems')[record.id] ?? record.items ?? [],
        sectionDetails: readObject('jobSectionDetails')[record.id] ?? {},
        valuationHistory: readBidList('jobValuationHistory').filter((entry) => String(entry.jobId) === String(record.id)),
        previousStatus: record.status, status: 'Complete', completedAt: new Date().toISOString(),
    };
    sessionStorage.setItem('completedJobs', JSON.stringify([...readBidList('completedJobs'), archived]));
    for (const key of ['availableJobs', 'acceptedJobs', 'createdJobs']) {
        sessionStorage.setItem(key, JSON.stringify(readBidList(key).filter((job) => String(job.id) !== String(record.id))));
    }
    try {
        if (String(JSON.parse(sessionStorage.getItem('selectedJob'))?.id) === String(record.id)) sessionStorage.removeItem('selectedJob');
    } catch { /* No valid selection to clear. */ }
    return archived;
}

export function archiveDeletedRecord(record, type) {
    const assignments = readBidList('jobAssignments');
    const archived = {
        ...record, pdf: record.pdf?.name ?? record.pdf ?? '', recordType: type,
        inspector: type === 'Job' ? assignments.find((entry) => String(entry.jobId) === String(record.id))?.inspector ?? record.inspector : record.inspector,
        previousStatus: record.status, status: 'Deleted', deletedAt: new Date().toISOString(),
    };
    sessionStorage.setItem('deletedRecords', JSON.stringify([
        ...readBidList('deletedRecords').filter((row) => !(row.recordType === type && String(row.id) === String(record.id))), archived,
    ]));
    const keys = type === 'Bid' ? ['availableBids', 'createdBids'] : ['availableJobs', 'acceptedJobs', 'createdJobs'];
    for (const key of keys) {
        sessionStorage.setItem(key, JSON.stringify(readBidList(key).filter((row) => String(row.id) !== String(record.id))));
    }
    const selectedKey = type === 'Bid' ? 'selectedBid' : 'selectedJob';
    try {
        if (String(JSON.parse(sessionStorage.getItem(selectedKey))?.id) === String(record.id)) sessionStorage.removeItem(selectedKey);
    } catch { /* No valid selection to clear. */ }
    return archived;
}

export function readHistoryRecords() {
    const records = new Map();
    const assignments = readBidList('jobAssignments');
    for (const bid of [...readBidList('createdBids'), ...readBidList('availableBids')]) {
        records.set(`Bid:${bid.id}`, { ...bid, recordType: 'Bid' });
    }
    for (const job of [...readBidList('acceptedJobs'), ...readBidList('createdJobs'), ...readBidList('availableJobs')]) {
        records.set(`Job:${job.id}`, {
            ...job, recordType: 'Job',
            inspector: assignments.find((entry) => String(entry.jobId) === String(job.id))?.inspector ?? job.inspector,
        });
    }
    for (const record of readBidList('completedJobs')) records.set(`Job:${record.id}`, record);
    for (const record of readBidList('deletedRecords')) records.set(`${record.recordType}:${record.id}`, record);
    return [...records.values()].map((record) => ({
        ...record,
        cityStateZip: [record.city, [record.state, record.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        rush: typeof record.rush === 'boolean' ? (record.rush ? 'Yes' : 'No') : record.rush,
        pdf: record.pdf?.name ?? record.pdf ?? '',
        inspector: record.inspector || record.assignedInspector || '',
    }));
}
