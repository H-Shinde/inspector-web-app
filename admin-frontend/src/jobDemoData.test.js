import { withJobDemoData } from './jobDemoData';

beforeEach(() => sessionStorage.clear());

test('expands original demo lists to fifteen items without duplicating them', () => {
    const job = withJobDemoData({ id: 1, name: 'Demo job' });
    expect(job.items).toHaveLength(15);
    const expanded = withJobDemoData({ ...job, items: job.items.slice(0, 4) });
    expect(expanded.items).toHaveLength(15);
    expect(withJobDemoData(expanded).items).toHaveLength(15);
    expect(expanded.items[14]).toMatchObject({ name: 'Floor scrubber', referenceNumber: 'JOB-1-ITEM-15' });
});

test('preserves saved item lists and leaves created jobs empty', () => {
    sessionStorage.setItem('jobItems', JSON.stringify({ 1: [{ name: 'Custom asset' }] }));
    expect(withJobDemoData({ id: 1, name: 'Demo job' }).items).toHaveLength(1);
    expect(withJobDemoData({ id: 2, name: 'Created job', isCreatedJob: true }).items).toEqual([]);
});
