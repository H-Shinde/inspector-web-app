export const assetPercentageFields = ['fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue', 'other'];
export const calculationTypes = ['Business Valuation (BV)', 'Calculation Valuation', 'Machinery & Equipment (M&E)'];
const valuation = [
    { field: 'consolidationFee', operation: 'add', multiplier: '100.00', when: 'always' },
    { field: 'bidAmount', operation: 'add', multiplier: '1.00', when: 'always' },
    { field: 'discount', operation: 'subtract', multiplier: '100.00', when: 'always' },
    { field: 'rushDiscount', operation: 'add', multiplier: '400.00', when: 'always' },
    { field: 'additionalCharges', operation: 'add', multiplier: '1.00', when: 'always' },
];
const percentages = assetPercentageFields.map((field) => ({ field, operation: 'add', multiplier: ({ orderlyLiquidationValue: '2.00', forcedLiquidationValue: '1.00', other: '10.00' })[field] || '5.00', when: 'always', mode: 'percentage' }));
export const defaultCalculationRules = {
    [calculationTypes[0]]: [...valuation, ...percentages],
    [calculationTypes[1]]: [...valuation, ...percentages],
    [calculationTypes[2]]: [...valuation.filter((term) => term.field !== 'additionalCharges'), ...percentages],
};
// Flat-amount fees: the field holds the dollar amount; the settings rule supplies its default.
const flatAmountFields = ['discount', 'rushDiscount'];
const conditionalFields = { discount: 'pdfOnly', rushDiscount: 'rush' };
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
    if (draft.calculationVersion === 'rates-v1') {
        const count = BigInt(Math.max(0, Math.trunc(Number(draft.totalInspectedItems) || 0)));
        const other = BigInt(Math.max(0, Math.trunc(Number(draft.totalNonInspectedItems) || 0)));
        const inspection = draft.reportFormat === 'Desktop' ? 0n : cents(draft.inspectionRate) * count;
        const appraisal = cents(draft.appraisalRate) * count + cents(draft.nonAppraisalRate) * other;
        const consolidation = calculationTerms(draft).find((term) => term.field === 'consolidationFee');
        const amount = inspection + appraisal + (draft.rush ? cents(draft.rushFee) : 0n) - (draft.pdfOnly ? cents(draft.discount) : 0n) + (draft.consolidationFee && consolidation ? cents(consolidation.multiplier) : 0n);
        const absolute = amount < 0n ? -amount : amount;
        return `${amount < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
    }
    let total = 0n;
    const rates = [];
    for (const term of calculationTerms(draft)) {
        if (term.when === 'rush' && !draft.rush || term.when === 'pdfOnly' && !draft.pdfOnly) continue;
        if (term.when === 'notRush' && draft.rush || term.when === 'notPdfOnly' && draft.pdfOnly) continue;
        const value = checkboxes.has(term.field) ? (Number(draft[term.field]) ? 100n : 0n) : cents(draft[term.field]);
        if (term.mode === 'percentage') { if (value) rates.push(cents(term.multiplier)); continue; }
        const multiplier = flatAmountFields.includes(term.field) ? 100n : cents(term.multiplier);
        const contribution = (value * multiplier + 50n) / 100n;
        total += term.operation === 'subtract' ? -contribution : contribution;
    }
    const base = total > 0n ? total : 0n;
    for (const rate of rates) total += (base * rate + 5000n) / 10000n;
    const absolute = total < 0n ? -total : total;
    return `${total < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
// Default dollar amount for a flat fee (PDF discount or rush surcharge) from the saved settings.
export function settingAmount(draft, field) {
    const term = calculationTerms(draft).find((entry) => entry.field === field && entry.mode !== 'percentage' && ['always', conditionalFields[field]].includes(entry.when));
    if (!term) return '';
    const amount = cents(term.multiplier);
    return `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}
