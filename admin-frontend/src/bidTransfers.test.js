import { moveBidToJobs } from './bidTransfers';
beforeEach(() => sessionStorage.clear());
test('a database bid does not overwrite an old browser bid with the same numeric ID', () => {
  sessionStorage.setItem('acceptedJobs', JSON.stringify([{ id: 21, sourceBidId: 1, name: 'Legacy Job' }]));
  const job = moveBidToJobs({ id: 1, recordType: 'Bid', inspector: 'Database Inspector', name: 'Database Bid' });
  const jobs = JSON.parse(sessionStorage.getItem('acceptedJobs'));
  expect(jobs).toHaveLength(2); expect(jobs[0].name).toBe('Legacy Job');
  expect(job).toMatchObject({ sourceBidId: 1, sourceBidBackend: 'django', name: 'Database Bid' });
});
