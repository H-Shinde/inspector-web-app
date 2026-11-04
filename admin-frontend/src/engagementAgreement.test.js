import fs from 'fs';
import path from 'path';
import { PDFArray, PDFDocument, PDFName } from 'pdf-lib';
import { agreementValues, generateEngagementAgreement, MACHINERY_EQUIPMENT, machineryAgreementValues } from './engagementAgreement';

const bid = {
    referenceNumber: 'BID-000021', businessName: 'Example Business', name: 'Avery Wilson',
    intendedUser: 'Example Client', reportFormat: 'Conclusion of Value', businessAddress: '12 Main Street',
    city: 'Buffalo', state: 'NY', zipCode: '14216', subjectContactEmail: 'avery@example.com',
    subjectContactPhone: '716-555-0101', bidAmount: '1200.50', discount: '100', additionalCharges: '25.25',
    rush: true, pdfOnly: true,
    clientCompany: 'Client Company', clientName: 'Jordan Smith', clientStreetAddress: '50 Client Avenue',
    clientCity: 'Albany', clientState: 'NY', clientZipCode: '01234', clientPhone: '518-555-0100', clientEmail: 'jordan@client.example',
};

test('maps client information separately from subject details and leaves uncollected fees blank', () => {
    expect(agreementValues(bid)).toMatchObject({ Company_Name: 'Client Company', Company_Street: '50 Client Avenue', Client_Name: 'Jordan Smith',
        Company_City: 'Albany, NY, 01234', Company_Phone: '518-555-0100', Client_Email: 'jordan@client.example',
        RUSH_RATE: '', CONS_RATE: '', BV_BID: '$1125.75', Contact_Name: 'Avery Wilson', pdfOnlySelected: true });
});

test('leaves missing client fields blank without borrowing subject or intended-user information', () => {
    expect(agreementValues({ intendedUser: 'Intended user', name: 'Subject Contact', city: 'Buffalo' })).toMatchObject({
        Company_Name: '', Client_Name: '', Company_Street: '', Company_City: '', Company_Phone: '', Client_Email: '',
    });
});

test('shows a rush discount as a deduction and includes it in the agreement total', () => {
    expect(agreementValues({ ...bid, rushDiscount: '50.25' })).toMatchObject({ RUSH_RATE: '-$50.25', BV_BID: '$1075.50' });
    expect(agreementValues({ ...bid, rush: false, rushDiscount: '50.25' })).toMatchObject({ RUSH_RATE: '', BV_BID: '$1125.75' });
});

test('fills the original three-page agreement with editable missing details', async () => {
    const template = Uint8Array.from(fs.readFileSync(path.join(process.cwd(), 'public/agreements/business-valuation-engagement.pdf')));
    const blob = await generateEngagementAgreement(bid, template);
    const bytes = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(Uint8Array.from(new Uint8Array(reader.result)));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3);
    const form = pdf.getForm();
    expect(form.getTextField('Reference_Number').getText()).toBe('BID-000021');
    expect(form.getTextField('Subject_Business').getText()).toBe('Example Business');
    expect(form.getTextField('BV_BID').getText()).toBe('$1125.75');
    expect(form.getTextField('Report_Type').getText()).toBe('Conclusion of Value');
    expect(form.getTextField('Company_Name').getText()).toBe('Client Company');
    expect(form.getTextField('Client_Name').getText()).toBe('Jordan Smith');
    expect(form.getTextField('Company_Street').getText()).toBe('50 Client Avenue');
    expect(form.getTextField('Company_City').getText()).toBe('Albany, NY, 01234');
    expect(form.getTextField('Company_Phone').getText()).toBe('518-555-0100');
    expect(form.getTextField('Client_Email').getText()).toBe('jordan@client.example');
    expect(form.getCheckBox('rushSelected').isChecked()).toBe(true);
    expect(form.getCheckBox('pdfOnlySelected').isChecked()).toBe(true);
    expect(form.getTextField('Company_Street').isReadOnly()).toBe(false);
});

test.each(['business-valuation', 'machinery-equipment'])('preserves original page dimensions and content streams for %s', async (type) => {
    const load = (file) => PDFDocument.load(Uint8Array.from(fs.readFileSync(path.join(process.cwd(), file))));
    const original = await load(`scripts/templates/${type}-engagement-original.pdf`);
    const template = await load(`public/agreements/${type}-engagement.pdf`);
    const streams = (document, page) => {
        const contents = document.context.lookup(page.node.get(PDFName.of('Contents')));
        const entries = contents instanceof PDFArray ? contents.asArray() : [contents];
        return entries.map((entry) => Array.from(document.context.lookup(entry).getContents()));
    };
    expect(template.getPageCount()).toBe(original.getPageCount());
    original.getPages().forEach((page, index) => {
        const mappedPage = template.getPages()[index];
        expect(mappedPage.getMediaBox()).toEqual(page.getMediaBox());
        expect(mappedPage.getCropBox()).toEqual(page.getCropBox());
        for (const bytes of streams(original, page)) expect(streams(template, mappedPage)).toContainEqual(bytes);
    });
    const field = type === 'business-valuation' ? 'Client_Name' : 'MAE_Bid';
    expect(template.getForm().getTextField(field).acroField.getWidgets()[0].P()).toEqual(template.getPages()[2].ref);
});


test.each(['Onsite', 'Desktop'])('fills the original M&E PDF and selects only the %s checkbox', async (reportFormat) => {
    const input = { ...bid, appraisalType: MACHINERY_EQUIPMENT, reportFormat, propertyType: 'Manufacturing equipment',
        valueType: 'Fair market value', valueDate: '2026-10-01', date: '2026-10-18', completionDays: '10' };
    const template = Uint8Array.from(fs.readFileSync(path.join(process.cwd(), 'public/agreements/machinery-equipment-engagement.pdf')));
    const blob = await generateEngagementAgreement(input, template);
    const bytes = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(Uint8Array.from(new Uint8Array(reader.result)));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
    const pdf = await PDFDocument.load(bytes);
    const form = pdf.getForm();
    expect(pdf.getPageCount()).toBe(3);
    for (const [field, value] of Object.entries(machineryAgreementValues(input))) {
        if (typeof value === 'boolean') expect(form.getCheckBox(field).isChecked()).toBe(value);
        else expect(form.getTextField(field).getText()).toBe(value);
    }
    expect(form.getTextField('MAE_Bid').getText()).toBe('$1200.50');
    expect(form.getTextField('Value_Date').getText()).toBe('10/01/2026');
    expect(form.getTextField('Request_Date').getText()).toBe('10/18/2026');
    expect(form.getTextField('business_days').getText()).toBe('10 business days');
    expect(form.getTextField('Company_Name').getText()).toBe('Client Company');
    expect(form.getFields().map((field) => field.getName())).not.toContain('BV_BID');
});
