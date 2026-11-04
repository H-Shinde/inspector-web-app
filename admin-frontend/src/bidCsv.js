import { parseCsv } from './itemCsv';
import { bidSections } from './bidSections';

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const fields = bidSections.flatMap(([, entries]) => entries).filter(([field]) => !['totalBid', 'referenceNumber', 'status'].includes(field));
const lookup = Object.fromEntries(fields.flatMap(([field, label]) => [[normalize(field), field], [normalize(label), field]]));
export function csvToBids(text) {
    const [header, ...rows] = parseCsv(text);
    if (!header || !rows.length) throw new Error('Include column headers and at least one bid row.');
    if (rows.length > 200) throw new Error('Upload up to 200 bids at a time.');
    const columns = header.map((title) => lookup[normalize(title.trim())]);
    const unknown = header.filter((title, index) => !columns[index]);
    if (unknown.length) throw new Error(`Unknown CSV columns: ${unknown.join(', ')}.`);
    if (new Set(columns).size !== columns.length) throw new Error('Remove duplicate CSV columns.');
    for (const required of ['appraisalType', 'businessName', 'name']) {
        if (!columns.includes(required)) throw new Error(`Missing required column: ${required}.`);
    }
    const checkboxes = new Set(fields.filter(([, , type]) => type === 'checkbox').map(([field]) => field));
    return rows.map((cells, index) => {
        if (cells.length !== columns.length) throw new Error(`Row ${index + 2}: Column count does not match the header.`);
        return Object.fromEntries(columns.map((field, column) => {
            let value = cells[column].trim();
            if (field === 'appraisalType') value = ({ 'Business Valuation': 'Business Valuation (BV)', 'Machinery and Equipment': 'Machinery & Equipment (M&E)' })[value] || value;
            if (checkboxes.has(field)) {
                if (!['', 'true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) throw new Error(`Row ${index + 2}: ${field} must be yes or no.`);
                value = ['true', 'yes', '1'].includes(value.toLowerCase());
            }
            return [field, value];
        }));
    });
}
