import { reportRows, reportTotals } from './reportData';
test('totals columns and keeps row totals from counting subtotals twice', () => {
    reportRows.forEach((row) => {
        expect(row.valuationTotal).toBe(row.valuationFalse + row.valuationTrue);
        expect(row.grandTotal).toBe(row.valuationTotal);
    });
    expect(reportTotals(reportRows.slice(0, 2))).toEqual({ clientCount: 2, valuationFalse: 0, valuationTrue: 2, valuationTotal: 2, grandTotal: 2 });
    expect(reportTotals(reportRows)).toEqual({ clientCount: 64, valuationFalse: 54, valuationTrue: 10, valuationTotal: 64, grandTotal: 64 });
    expect(reportTotals([]).grandTotal).toBe(0);
});
