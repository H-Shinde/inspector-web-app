import { fieldError } from './fieldValidation';
// Converts CSV text into job items. Header names are matched loosely
// (case, spaces and symbols are ignored), e.g. "Hours/Miles", "hours_miles" and "Mileage/hours" all map to hoursMiles.

const ALIASES = {
    name: ['name', 'itemname', 'item', 'asset', 'assetname', 'description'],
    type: ['type', 'itemtype', 'category'],
    make: ['make', 'manufacturer', 'brand'],
    model: ['model', 'modelnumber'],
    serialNumber: ['serial', 'serialnumber', 'serialno'],
    year: ['year', 'modelyear'],
    hoursMiles: ['hoursmiles', 'hoursormiles', 'mileagehours', 'hoursmileage', 'mileage', 'hours', 'miles'],
    photoNumber: ['photo', 'photonumber', 'photono'],
    referenceNumber: ['ref', 'refno', 'refnumber', 'reference', 'referencenumber'],
    comments: ['comments', 'comment', 'notes', 'note'],
};
const LOOKUP = Object.fromEntries(Object.entries(ALIASES).flatMap(([field, names]) => names.map((name) => [name, field])));
const normalize = (header) => String(header).toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseCsv(text) {
    const src = String(text).replace(/^\uFEFF/, '');
    const firstLine = src.split(/\r\n|\n|\r/, 1)[0] ?? '';
    const delimiter = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (quoted) {
            if (c === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
            } else field += c;
        } else if (c === '"' && field === '') quoted = true;
        else if (c === delimiter) { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && src[i + 1] === '\n') i++;
            row.push(field); field = ''; rows.push(row); row = [];
        } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

// Returns { items, skipped, ignoredColumns }. Throws an Error with a user-facing message for unusable files.
export function csvToItems(text) {
    const rows = parseCsv(text);
    if (!rows.length) throw new Error('The CSV file is empty.');
    const [header, ...data] = rows;
    const columns = header.map((title) => LOOKUP[normalize(title)] ?? null);
    if (!columns.includes('name')) throw new Error('The CSV needs a "Name" column in its first row.');
    const ignoredColumns = header.filter((title, index) => !columns[index] && title.trim()).map((title) => title.trim());
    const items = [];
    let skipped = 0;
    for (const cells of data) {
        const item = {};
        columns.forEach((field, index) => {
            const value = cells[index]?.trim();
            if (field && value && item[field] === undefined) item[field] = value;
        });
        if (item.name) {
            const error = fieldError('year', item.year);
            if (error) throw new Error(`CSV row ${items.length + skipped + 2}: ${error}`);
            items.push(item);
        } else skipped++;
    }
    return { items, skipped, ignoredColumns };
}