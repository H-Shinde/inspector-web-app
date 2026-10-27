import { calculateConfiguredTotal, defaultCalculationRules, calculationTypes } from './bidCalculation';
test('uses legacy defaults for each bid type', () => {
    const values = { bidAmount: '1000', discount: '50', rushDiscount: '25', additionalCharges: '100', rush: true };
    expect(calculateConfiguredTotal({ ...values, appraisalType: calculationTypes[0] })).toBe('1025.00');
    expect(calculateConfiguredTotal({ ...values, appraisalType: calculationTypes[1] })).toBe('1025.00');
    expect(calculateConfiguredTotal({ ...values, appraisalType: calculationTypes[2] })).toBe('1000.00');
});
test('combines counts, checkbox fees and PDF-only discounts', () => {
    const rules = { ...defaultCalculationRules, [calculationTypes[2]]: [
        { field: 'bidAmount', operation: 'add', multiplier: '1', when: 'always' },
        { field: 'totalInspectedItems', operation: 'add', multiplier: '25.50', when: 'always' },
        { field: 'rush', operation: 'add', multiplier: '100', when: 'always' },
        { field: 'discount', operation: 'subtract', multiplier: '1', when: 'pdfOnly' },
    ] };
    const values = { appraisalType: calculationTypes[2], calculationRules: rules, bidAmount: '1000', totalInspectedItems: 3, discount: '50' };
    expect(calculateConfiguredTotal({ ...values, rush: true, pdfOnly: true })).toBe('1126.50');
    expect(calculateConfiguredTotal({ ...values, rush: false, pdfOnly: false })).toBe('1076.50');
});
test('rounds each contribution to cents and supports unchecked conditions', () => {
    const rules = { [calculationTypes[0]]: [{ field: 'bidAmount', operation: 'add', multiplier: '.50', when: 'notRush' }] };
    rules[calculationTypes[0]][0].multiplier = '0.50';
    expect(calculateConfiguredTotal({ calculationRules: rules, bidAmount: '0.01', rush: false })).toBe('0.01');
    expect(calculateConfiguredTotal({ calculationRules: rules, bidAmount: '0.01', rush: true })).toBe('0.00');
});
test('handles large decimal totals without floating-point precision loss', () => {
    const rules = { [calculationTypes[0]]: [{ field: 'bidAmount', operation: 'add', multiplier: '1000000.00', when: 'always' }] };
    expect(calculateConfiguredTotal({ calculationRules: rules, bidAmount: '9999999999.99' })).toBe('9999999999990000.00');
});

test('accepts decimal input shorthand and scientific notation', () => {
    const rules = { [calculationTypes[0]]: [{ field: 'bidAmount', operation: 'add', multiplier: '.50', when: 'always' }] };
    expect(calculateConfiguredTotal({ calculationRules: rules, bidAmount: '1e3' })).toBe('500.00');
});
