// Sample counts until report data is connected.
export const reportRows = [
    [1, 8, 5, 3], [2, 12, 4, 8], [3, 6, 4, 2], [4, 15, 6, 9],
    [5, 9, 7, 2], [6, 18, 8, 10], [7, 7, 3, 4], [8, 11, 6, 5],
    [9, 5, 2, 3], [10, 14, 9, 5], [11, 10, 4, 6], [12, 13, 7, 6],
].map(([id, clientCount, valuationFalse, valuationTrue]) => ({
    id, clientCount, valuationFalse, valuationTrue,
    valuationTotal: valuationFalse + valuationTrue,
    // False and True are disjoint counts; don't add the subtotal again.
    grandTotal: valuationFalse + valuationTrue,
}));
export const totalFields = ['clientCount', 'valuationFalse', 'valuationTrue', 'valuationTotal', 'grandTotal'];
export function reportTotals(rows) {
    return Object.fromEntries(totalFields.map((field) => [field, rows.reduce((sum, row) => sum + Number(row[field] || 0), 0)]));
}
