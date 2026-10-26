export const CALCULATION_VALUATION = 'Calculation Valuation';

export function appraisalTypeLabel(value) {
    return ({
        'Calculation Valuation': 'Calculation Valuation',
        'Business Valuation (BV)': 'Business Valuation',
        'Machinery & Equipment (M&E)': 'Machinery and Equipment',
        'BV': 'Business Valuation',
        'M&E': 'Machinery and Equipment',
        'Commercial appraisal': 'Business Valuation',
        'Market valuation': 'Business Valuation',
        'Equipment appraisal': 'Machinery and Equipment',
    })[value] || value || '';
}
