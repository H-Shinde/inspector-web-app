import { CALCULATION_VALUATION, reportChoices, reportFields } from './appraisalTypes';
import { parseCsv } from './Itemcsv';

export const jobCsvHeaders = ['Reference #', 'Appraisal Type', 'Client', 'Business Name', 'Client Name', 'Date', 'Client Email', 'Total Bid'];
const fields = ['externalReference', 'appraisalType', 'clientCompany', 'businessName', 'clientName', 'date', 'clientEmail', 'bidAmount'];
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const appraisalTypes = new Map(reportChoices.map((choice) => [normalize(choice), reportFields(choice)]));
for (const [name, appraisalType] of [
    ['Business Valuation (BV)', 'Business Valuation (BV)'], ['BV', 'Business Valuation (BV)'],
    ['Calculation Valuation', CALCULATION_VALUATION], ['Machinery and Equipment', 'Machinery & Equipment (M&E)'],
    ['Machinery & Equipment (M&E)', 'Machinery & Equipment (M&E)'], ['M&E', 'Machinery & Equipment (M&E)'],
]) {
    appraisalTypes.set(normalize(name), { appraisalType, reportFormat: '' });
}

export function csvToJobs(text) {
    const [header, ...rows] = parseCsv(text);
    if (!header || !rows.length) throw new Error('Include the column headers and at least one job row.');
    if (rows.length > 200) throw new Error('Upload up to 200 jobs at a time.');
    if (header.length !== jobCsvHeaders.length || jobCsvHeaders.some((label, index) => normalize(label) !== normalize(header[index]))) {
        throw new Error('CSV columns must match the listed order.');
    }
    return rows.map((cells, index) => {
        if (cells.length !== fields.length) throw new Error(`Row ${index + 2}: Expected eight columns.`);
        const job = Object.fromEntries(fields.map((field, column) => [field, cells[column].trim()]));
        const appraisal = appraisalTypes.get(normalize(job.appraisalType));
        if (!appraisal) throw new Error(`Row ${index + 2}: Enter a valid appraisal type.`);
        const amount = job.bidAmount.replace(/^\$\s*/, '');
        if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(amount)) {
            throw new Error(`Row ${index + 2}: Enter a valid nonnegative Total Bid.`);
        }
        return { ...job, ...appraisal, bidAmount: amount.replaceAll(',', '') };
    });
}
