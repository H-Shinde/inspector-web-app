import { calculateTotalBid } from './bidFields';

test('previews pricing using decimal cents', () => {
    expect(calculateTotalBid({ bidAmount: '1200.50', discount: '100', additionalCharges: '25.25' })).toBe('1125.75');
});

test('deducts the rush discount only for rush bids', () => {
    const pricing = { bidAmount: '1000', discount: '100', additionalCharges: '25', rushDiscount: '50.25' };
    expect(calculateTotalBid({ ...pricing, rush: true })).toBe('874.75');
    expect(calculateTotalBid({ ...pricing, rush: false })).toBe('925.00');
});
