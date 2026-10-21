import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { generateInspectionRequest, inspectionRequestValues, inspectorJobEmail } from './inspectionRequest';

const job = { id: 21, referenceNumber: 'BID-000021', businessName: 'Example Machinery', name: 'Subject Contact', clientEmail: 'client@example.com', subjectContactEmail: 'contact@example.com', businessAddress: '10 Main St', city: 'Albany', state: 'NY', zipCode: '12207', valueDate: '2026-10-21' };
const inspector = { name: 'Alex Morgan', email: 'alex@example.com' };

test('maps job, inspector, and inspection fee without substituting client data or appraisal pricing', () => {
    expect(inspectionRequestValues({ ...job, bidAmount: 2000 }, inspector, { 'Inspection Fees': { total: 350 } })).toMatchObject({
        Inspector_Name: 'Alex Morgan', Contact_Email: 'contact@example.com', Inspection_Rate: '$350.00', Business_City: 'Albany, NY 12207', Value_Date: '10/21/2026', location_count: '',
    });
    expect(inspectionRequestValues({ ...job, bidAmount: 2000 }, inspector)).toMatchObject({ Inspection_Rate: '', location_count: '' });
    expect(inspectorJobEmail(job, inspector)).toMatchObject({ to: 'alex@example.com', subject: expect.stringContaining('BID-000021'), body: expect.stringContaining('Alex,') });
});

test('fills the supplied two-page template and keeps missing values editable', async () => {
    const template = Uint8Array.from(fs.readFileSync('public/agreements/machinery-equipment-inspection-request.pdf'));
    const blob = await generateInspectionRequest(job, inspector, { 'Inspection Fees': { total: 350 } }, template);
    const bytes = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(new Uint8Array(reader.result)); reader.readAsArrayBuffer(blob); });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    const form = pdf.getForm();
    expect(form.getTextField('Reference_Number_1').getText()).toBe('BID-000021');
    expect(form.getTextField('Subject_Business_2').getText()).toBe('Example Machinery');
    expect(form.getTextField('Subject_Business_3').getText()).toBe('Example Machinery');
    expect(form.getTextField('Inspector_Name_4').getText()).toBe('Alex Morgan');
    expect(form.getTextField('Inspection_Rate_5').getText()).toBe('$350.00');
    expect(form.getTextField('location_count_6').getText() || '').toBe('');
    expect(form.getTextField('Contact_Email_10').getText()).toBe('contact@example.com');
    expect(form.getTextField('location_count_6').isReadOnly()).toBe(false);
    expect(pdf.getPages()[1].node.Annots()?.size() || 0).toBe(0);
});
