// Categories and valuation counts from the original BarLineChart.svg.
// Client counts use the total of the disjoint False and True counts.
export const reportRows = [
    [400, 0, 1], [500, 0, 1], [1200, 3, 1], [1300, 17, 2],
    [1400, 9, 2], [1500, 14, 0], [1600, 10, 1], [1700, 1, 0],
    [1800, 0, 1], [2000, 0, 1],
].map(([id, valuationFalse, valuationTrue]) => ({
    id, clientCount: valuationFalse + valuationTrue, valuationFalse, valuationTrue,
    valuationTotal: valuationFalse + valuationTrue,
    // False and True are disjoint counts; don't add the subtotal again.
    grandTotal: valuationFalse + valuationTrue,
}));
export const totalFields = ['clientCount', 'valuationFalse', 'valuationTrue', 'valuationTotal', 'grandTotal'];
export function reportTotals(rows) {
    return Object.fromEntries(totalFields.map((field) => [field, rows.reduce((sum, row) => sum + Number(row[field] || 0), 0)]));
}
