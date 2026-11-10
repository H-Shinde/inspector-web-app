import { newBidSubtotals, usesNewBidTiers } from './newBidPricing';

const values = { tier: '5', totalInspectedItems: '10', totalNonInspectedItems: '2', inspectionRate: '10', appraisalRate: '20', nonAppraisalRate: '3' };
test.each([
    ['Business Valuation (BV)', ''],
    ['Calculation Valuation', ''],
    ['Machinery & Equipment (M&E)', 'Desktop'],
    ['', ''],
])('does not use tier prices for %s / %s', (appraisalType, reportFormat) => {
    const bid = { ...values, appraisalType, reportFormat };
    expect(usesNewBidTiers(bid)).toBe(false);
    expect(newBidSubtotals(bid)).toEqual({ total: reportFormat === 'Desktop' ? 0 : 100, totalAppraisal: 206 });
    expect(newBidSubtotals({ ...bid, tier: '1' })).toEqual(newBidSubtotals(bid));
});
test('On-site M&E uses the selected tier for appraisal and inspection charges', () => {
    const bid = { ...values, appraisalType: 'Machinery & Equipment (M&E)', reportFormat: 'Onsite' };
    expect(usesNewBidTiers(bid)).toBe(true);
    expect(newBidSubtotals(bid).total).toBe(439);
    expect(newBidSubtotals(bid).totalAppraisal).toBe(431);
    expect(newBidSubtotals({ ...bid, tier: '1' }).totalAppraisal).toBe(331);
});