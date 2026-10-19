import { createBid } from './bidFields';

beforeEach(() => sessionStorage.clear());

test('automates saved status, reference numbers and pricing totals', () => {
    const draft = { name: 'Avery', status: 'Accepted', referenceNumber: 'manual', totalBid: '1', bidAmount: '1200.50', discount: '100', additionalCharges: '25.25' };
    const first = createBid(draft);
    const second = createBid(draft);
    expect(first).toMatchObject({ status: 'Pending', referenceNumber: 'BID-000021', totalBid: '1125.75' });
    expect(second.referenceNumber).toBe('BID-000022');
    expect(JSON.parse(sessionStorage.getItem('selectedBid'))).toEqual(second);
    expect(JSON.parse(sessionStorage.getItem('createdBids'))).toEqual([first, second]);
});

test('deducts the rush discount only for rush bids and saves the calculated total', () => {
    const pricing = { bidAmount: '1000', discount: '100', additionalCharges: '25', rushDiscount: '50.25' };
    expect(createBid({ ...pricing, rush: true })).toMatchObject({ rushDiscount: '50.25', totalBid: '874.75' });
    expect(createBid({ ...pricing, rush: false }).totalBid).toBe('925.00');
});
