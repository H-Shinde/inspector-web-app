export const CALCULATION_VALUATION = 'Calculation Valuation';
export const reportChoices = ['Calculation of Value', 'Business Valuation', 'Desktop M&E', 'On-site M&E'];
export function reportSelection(values) {
    if (values?.appraisalType === 'Machinery & Equipment (M&E)') return values.reportFormat === 'Desktop' ? 'Desktop M&E' : values.reportFormat === 'Onsite' ? 'On-site M&E' : '';
    return values?.appraisalType === CALCULATION_VALUATION ? 'Calculation of Value' : values?.appraisalType === 'Business Valuation (BV)' ? 'Business Valuation' : '';
}
export function reportFields(choice) {
    return { appraisalType: choice === 'Calculation of Value' ? CALCULATION_VALUATION : choice === 'Business Valuation' ? 'Business Valuation (BV)' : choice ? 'Machinery & Equipment (M&E)' : '', reportFormat: choice === 'Desktop M&E' ? 'Desktop' : choice === 'On-site M&E' ? 'Onsite' : '' };
}

export function appraisalTypeLabel(value) {
    return ({
        'Calculation Valuation': 'Calculation of Value',
        'Business Valuation (BV)': 'Business Valuation',
        'Machinery & Equipment (M&E)': 'Machinery and Equipment',
        'BV': 'Business Valuation',
        'M&E': 'Machinery and Equipment',
        'Commercial appraisal': 'Business Valuation',
        'Market valuation': 'Business Valuation',
        'Equipment appraisal': 'Machinery and Equipment',
    })[value] || value || '';
}
