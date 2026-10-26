import { appraisalTypeLabel } from './appraisalTypes';
import { agreementValues } from './engagementAgreement';
import { businessValuationEmail } from './bidEmail';

test('keeps valuation types distinct in display, agreement and email', () => {
    for (const [stored, label] of [
        ['Business Valuation (BV)', 'Business Valuation'],
        ['Calculation Valuation', 'Calculation Valuation'],
    ]) {
        const bid = { appraisalType: stored, businessName: 'Example' };
        expect(appraisalTypeLabel(stored)).toBe(label);
        expect(agreementValues(bid).Order_Type).toBe(label);
        expect(businessValuationEmail(bid).subject).toBe(`${label} Bid – Example`);
    }
    expect(appraisalTypeLabel('Machinery & Equipment (M&E)')).toBe('Machinery and Equipment');
});
