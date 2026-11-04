import { csvToItems, parseCsv } from './Itemcsv';

test('parses quoted commas, escaped quotes, line breaks, CRLF and a BOM', () => {
    const text = '\uFEFFa,b\r\n"x, y","say ""hi"""\r\n"line1\nline2",z\r\n';
    expect(parseCsv(text)).toEqual([['a', 'b'], ['x, y', 'say "hi"'], ['line1\nline2', 'z']]);
});

test('detects semicolon-delimited files', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
});

test('maps loose headers to item fields, skips nameless rows and reports ignored columns', () => {
    const { items, skipped, ignoredColumns } = csvToItems('Item Name,Hours/Miles,Serial #,Photo#,Ref#,Notes,Color\nForklift,1200 hours,SN1,3,R1,ok,red\n,1,2,3,4,5,6\n');
    expect(items).toEqual([{ name: 'Forklift', hoursMiles: '1200 hours', serialNumber: 'SN1', photoNumber: '3', referenceNumber: 'R1', comments: 'ok' }]);
    expect(skipped).toBe(1);
    expect(ignoredColumns).toEqual(['Color']);
});

test('rejects empty files and files without a name column', () => {
    expect(() => csvToItems('')).toThrow('empty');
    expect(() => csvToItems('Make,Model\nToyota,X')).toThrow('"Name" column');
});