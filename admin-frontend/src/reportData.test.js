import { reportRows, reportTotals } from './reportData';
test('totals columns and keeps row totals from counting subtotals twice', () => {
    reportRows.forEach((row) => {
        expect(row.valuationTotal).toBe(row.valuationFalse + row.valuationTrue);
        expect(row.grandTotal).toBe(row.valuationTotal);
    });
    expect(reportTotals(reportRows.slice(0, 2))).toEqual({ clientCount: 20, valuationFalse: 9, valuationTrue: 11, valuationTotal: 20, grandTotal: 20 });
    expect(reportTotals([]).grandTotal).toBe(0);
});
