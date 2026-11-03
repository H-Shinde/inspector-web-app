import { calculateConfiguredTotal, defaultCalculationRules, calculationTypes, settingAmount } from './bidCalculation';
test('uses legacy defaults for each bid type', () => {
    const values = { bidAmount: '1000', discount: '50', rushDiscount: '25', additionalCharges: '100', rush: true };
    expect(calculateConfiguredTotal({ ...values, appraisalType: calculationTypes[0] })).toBe('1075.00');
    expect(calculateConfiguredTotal({ ...values, appraisalType: calculationTypes[1] })).toBe('1075.00');
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

test('asset percentages apply to the fixed subtotal and do not compound', () => {
    const rules = JSON.parse(JSON.stringify(defaultCalculationRules));
    rules[calculationTypes[0]].find((term) => term.field === 'fmvContinuedUse').multiplier = '10';
    const values = { appraisalType: calculationTypes[0], calculationRules: rules, bidAmount: '1000', discount: '100', additionalCharges: '100', fmvContinuedUse: true, fairMarketValueRemoved: true };
    expect(calculateConfiguredTotal(values)).toBe('1150.00');
    expect(calculateConfiguredTotal({ ...values, fmvContinuedUse: false, fairMarketValueRemoved: false })).toBe('1000.00');
    expect(calculateConfiguredTotal({ ...values, fmvContinuedUse: '1.00', fairMarketValueRemoved: '0.00' })).toBe('1100.00');
});

test('PDF discount and rush surcharge use the entered dollar amount, not the settings multiplier', () => {
    const rules = { [calculationTypes[0]]: [
        { field: 'bidAmount', operation: 'add', multiplier: '1', when: 'always' },
        { field: 'discount', operation: 'subtract', multiplier: '75', when: 'always' },
        { field: 'rushDiscount', operation: 'add', multiplier: '40', when: 'always' },
    ] };
    const values = { calculationRules: rules, bidAmount: '1000' };
    expect(calculateConfiguredTotal({ ...values, discount: '75', rushDiscount: '40' })).toBe('965.00');
    expect(calculateConfiguredTotal({ ...values, discount: '75', rushDiscount: '' })).toBe('925.00');
    expect(calculateConfiguredTotal({ ...values, discount: '', rushDiscount: '60.5' })).toBe('1060.50');
});

test('settingAmount returns the configured default for PDF discount and rush surcharge', () => {
    const rules = { [calculationTypes[0]]: [
        { field: 'discount', operation: 'subtract', multiplier: '75', when: 'pdfOnly' },
        { field: 'rushDiscount', operation: 'add', multiplier: '40.5', when: 'rush' },
    ] };
    expect(settingAmount({ calculationRules: rules }, 'discount')).toBe('75.00');
    expect(settingAmount({ calculationRules: rules }, 'rushDiscount')).toBe('40.50');
    expect(settingAmount({ calculationRules: rules, appraisalType: calculationTypes[2] }, 'discount')).toBe('');
});