export const calculationTypes = ['Business Valuation (BV)', 'Calculation Valuation', 'Machinery & Equipment (M&E)'];
const valuation = [
    { field: 'bidAmount', operation: 'add', multiplier: '1.00', when: 'always' },
    { field: 'discount', operation: 'subtract', multiplier: '1.00', when: 'always' },
    { field: 'rushDiscount', operation: 'subtract', multiplier: '1.00', when: 'rush' },
    { field: 'additionalCharges', operation: 'add', multiplier: '1.00', when: 'always' },
];
export const defaultCalculationRules = {
    [calculationTypes[0]]: valuation,
    [calculationTypes[1]]: valuation,
    [calculationTypes[2]]: [valuation[0]],
};
const checkboxes = new Set(['rush', 'pdfOnly', 'fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue']);
function cents(value) {
    if (value === true) return 100n;
    const text = String(value || '0');
    const match = text.match(/^(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
    if (!match || !(match[1] || match[2])) return 0n;
    const exponent = Number(match[3] || 0);
    if (Math.abs(exponent) > 20) return 0n;
    const digits = BigInt((match[1] || '0') + (match[2] || ''));
    const scale = (match[2] || '').length - exponent - 2;
    if (scale <= 0) return digits * 10n ** BigInt(-scale);
    const divisor = 10n ** BigInt(scale);
    return (digits + divisor / 2n) / divisor;
}
export function calculationTerms(draft) {
    const rules = draft.calculationRules || defaultCalculationRules;
    return rules[draft.appraisalType || calculationTypes[0]] || [];
}
export function calculateConfiguredTotal(draft) {
    let total = 0n;
    for (const term of calculationTerms(draft)) {
        if (term.when === 'rush' && !draft.rush || term.when === 'pdfOnly' && !draft.pdfOnly) continue;
        if (term.when === 'notRush' && draft.rush || term.when === 'notPdfOnly' && draft.pdfOnly) continue;
        const value = checkboxes.has(term.field) ? (Number(draft[term.field]) ? 100n : 0n) : cents(draft[term.field]);
        const contribution = (value * cents(term.multiplier) + 50n) / 100n;
        total += term.operation === 'subtract' ? -contribution : contribution;
    }
    const absolute = total < 0n ? -total : total;
    return `${total < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
