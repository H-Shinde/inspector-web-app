import { archiveDeletedRecord, isDeletedRecord, readHistoryRecords, completeJob, isCompletedJob } from './historyRecords';

beforeEach(() => sessionStorage.clear());

test('archives a deleted bid with its details and removes only that bid from active lists', () => {
    const bid = { id: 1, name: 'Avery', businessName: 'Example Co', status: 'Pending', clientEmail: 'client@example.com' };
    for (const key of ['createdBids', 'availableBids']) sessionStorage.setItem(key, JSON.stringify([bid, { id: 2 }]));
    sessionStorage.setItem('selectedBid', JSON.stringify(bid));
    archiveDeletedRecord(bid, 'Bid');
    expect(isDeletedRecord('Bid', 1)).toBe(true);
    expect(isDeletedRecord('Job', 1)).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('availableBids'))).toEqual([{ id: 2 }]);
    expect(JSON.parse(sessionStorage.getItem('createdBids'))).toEqual([{ id: 2 }]);
    expect(sessionStorage.getItem('selectedBid')).toBeNull();
    expect(readHistoryRecords().find((row) => row.id === 1)).toMatchObject({ ...bid, status: 'Declined', previousStatus: 'Pending', recordType: 'Bid', deletedAt: expect.any(String) });
});

test('keeps jobs without a source bid and preserves assigned inspectors when deleted', () => {
    const job = { id: 1, name: 'Jordan', status: 'Assigned' };
    sessionStorage.setItem('availableBids', JSON.stringify([{ id: 1, name: 'Avery' }]));
    sessionStorage.setItem('availableJobs', JSON.stringify([job]));
    sessionStorage.setItem('acceptedJobs', JSON.stringify([job]));
    sessionStorage.setItem('createdJobs', JSON.stringify([job]));
    sessionStorage.setItem('jobAssignments', JSON.stringify([{ jobId: 1, inspector: 'Alex Morgan' }]));
    archiveDeletedRecord(job, 'Job');
    const records = readHistoryRecords();
    expect(records).toEqual([expect.objectContaining({ id: 1, recordType: 'Job', status: 'Declined', inspector: 'Alex Morgan' })]);
    for (const key of ['availableJobs', 'acceptedJobs', 'createdJobs']) expect(JSON.parse(sessionStorage.getItem(key))).toEqual([]);
});


test('completes a job once, preserves its details, and removes only it from active lists', () => {
    const job = { id: 1, name: 'Jordan', status: 'Pending Review', sourceBidId: 21 };
    for (const key of ['availableJobs', 'acceptedJobs', 'createdJobs']) sessionStorage.setItem(key, JSON.stringify([job, { id: 2 }]));
    sessionStorage.setItem('selectedJob', JSON.stringify(job));
    sessionStorage.setItem('jobAssignments', JSON.stringify([{ jobId: 1, inspector: 'Alex Morgan' }]));
    sessionStorage.setItem('jobItems', JSON.stringify({ 1: [{ name: 'Forklift' }] }));
    sessionStorage.setItem('jobSectionDetails', JSON.stringify({ 1: { 'Asset Valuation': { fmv: 500 } } }));
    completeJob(job);
    completeJob(job);
    expect(isCompletedJob('1')).toBe(true);
    expect(isDeletedRecord('Job', 1)).toBe(false);
    for (const key of ['availableJobs', 'acceptedJobs', 'createdJobs']) expect(JSON.parse(sessionStorage.getItem(key))).toEqual([{ id: 2 }]);
    expect(sessionStorage.getItem('selectedJob')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('completedJobs'))).toHaveLength(1);
    expect(readHistoryRecords().find((record) => record.id === 1)).toMatchObject({
        status: 'Completed', previousStatus: 'Pending Review', completedAt: expect.any(String), recordType: 'Job',
        inspector: 'Alex Morgan', items: [{ name: 'Forklift' }], sectionDetails: { 'Asset Valuation': { fmv: 500 } },
    });
});

test('history only contains completed and declined records', () => {
    sessionStorage.setItem('availableBids', JSON.stringify([{ id: 1, status: 'Pending' }, { id: 2, status: 'Declined' }]));
    sessionStorage.setItem('availableJobs', JSON.stringify([{ id: 3, status: 'Assigned' }]));
    completeJob({ id: 4, status: 'Assigned' });
    archiveDeletedRecord({ id: 5, status: 'Assigned' }, 'Job');
    const statuses = Object.fromEntries(readHistoryRecords().map((row) => [`${row.recordType}${row.id}`, row.status]));
    expect(statuses).toEqual({ Bid2: 'Declined', Job4: 'Completed', Job5: 'Declined' });
});