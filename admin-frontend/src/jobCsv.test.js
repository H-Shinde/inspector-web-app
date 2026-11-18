import { csvToJobs, jobCsvHeaders } from './jobCsv';

test('imports exactly the job columns in their requested order', () => {
    const header = jobCsvHeaders.join(',');
    const row = 'OLD-42,On-site M&E,"First Bank, Inc.",Example,Alex,11/18/2026,alex@example.com,"$1,250.50"';
    expect(csvToJobs(`${header}\n${row}`)).toEqual([{
        externalReference: 'OLD-42', appraisalType: 'Machinery & Equipment (M&E)', reportFormat: 'Onsite',
        clientCompany: 'First Bank, Inc.', businessName: 'Example', clientName: 'Alex',
        date: '11/18/2026', clientEmail: 'alex@example.com', bidAmount: '1250.50',
    }]);
    expect(() => csvToJobs(`${header.replace('Client,Business Name', 'Business Name,Client')}\n${row}`)).toThrow('listed order');
});
