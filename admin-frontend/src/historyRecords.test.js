import { archiveDeletedRecord, isDeletedRecord, readHistoryRecords } from './historyRecords';

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
    expect(readHistoryRecords().find((row) => row.id === 1)).toMatchObject({ ...bid, status: 'Deleted', previousStatus: 'Pending', recordType: 'Bid', deletedAt: expect.any(String) });
});

test('keeps jobs without a source bid and preserves assigned inspectors when deleted', () => {
    const job = { id: 1, name: 'Jordan', status: 'Assigned' };
    sessionStorage.setItem('availableBids', JSON.stringify([{ id: 1, name: 'Avery' }]));
    sessionStorage.setItem('availableJobs', JSON.stringify([job]));
    sessionStorage.setItem('acceptedJobs', JSON.stringify([job]));
    sessionStorage.setItem('createdJobs', JSON.stringify([job]));
    sessionStorage.setItem('jobAssignments', JSON.stringify([{ jobId: 1, inspector: 'Alex Morgan' }]));
    archiveDeletedRecord(job, 'Job');
    expect(readHistoryRecords()).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 1, recordType: 'Bid', name: 'Avery' }),
        expect.objectContaining({ id: 1, recordType: 'Job', status: 'Deleted', inspector: 'Alex Morgan' }),
    ]));
    for (const key of ['availableJobs', 'acceptedJobs', 'createdJobs']) expect(JSON.parse(sessionStorage.getItem(key))).toEqual([]);
});
