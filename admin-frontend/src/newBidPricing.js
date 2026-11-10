import { tierSubtotals } from './tierRates';

export const usesNewBidTiers = (values) => values.appraisalType === 'Machinery & Equipment (M&E)' && values.reportFormat === 'Onsite';

export function newBidSubtotals(values) {
    if (usesNewBidTiers(values)) return tierSubtotals(values);
    return {
        total: values.reportFormat === 'Desktop' ? 0 : (Number(values.inspectionRate) || 0) * (Number(values.totalInspectedItems) || 0),
        totalAppraisal: (Number(values.appraisalRate) || 0) * (Number(values.totalInspectedItems) || 0)
            + (Number(values.nonAppraisalRate) || 0) * (Number(values.totalNonInspectedItems) || 0),
    };
}