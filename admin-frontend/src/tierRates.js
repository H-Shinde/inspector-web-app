export const tierTables = {
    inspection: [[32.5,27.5,25,22.5,20],[35,30,27.5,25,22.5],[37.5,32.5,30,27.5,25],[40,35,32.5,30,27.5],[42.5,37.5,35,32.5,30]],
    nonAppraisedInspection: [[5,4,3,2,1],[6,5,4,3,2],[6.5,5.5,4.5,3.5,2.5],[7,6.5,5.5,4.5,3.5],[7,6.5,5.5,4.5,3.5]],
    appraisal: [[32.5,30,28,26,24],[35,33,31,28,26],[37.5,36,34,30,28],[40,37.5,36,32.5,30],[42.5,40,37,35,33]],
};
export function tierRate(table, tier, count) {
    return tierTables[table][Math.min(5, Math.max(1, Number(tier) || 1)) - 1][Math.min(4, Math.max(0, Math.ceil((Number(count) || 0) / 10) - 1))];
}
export function tierSubtotals(values) {
    const count = Number(values.totalInspectedItems) || 0;
    const other = Number(values.totalNonInspectedItems) || 0;
    return {
        inspectionRate: tierRate('inspection', values.tier, count),
        appraisalRate: tierRate('appraisal', values.tier, count),
        nonAppraisedInspectionRate: tierRate('nonAppraisedInspection', values.tier, other),
        total: values.reportFormat === 'Desktop' ? 0 : tierRate('inspection', values.tier, count) * count + tierRate('nonAppraisedInspection', values.tier, other) * other,
        totalAppraisal: tierRate('appraisal', values.tier, count) * count + (Number(values.nonAppraisalRate) || 0) * other,
    };
}
