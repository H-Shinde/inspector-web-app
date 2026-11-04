import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const INSPECTION_REQUEST_TEMPLATE = '/agreements/machinery-equipment-inspection-request.pdf';

export function inspectionRequestValues(job, inspector, sections = {}) {
    const fee = job.inspectionFee ?? sections['Inspection Fees']?.total;
    return {
        Value_Date: (job.valueDate || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1'),
        Reference_Number: job.referenceNumber || `JOB-${String(job.id).padStart(6, '0')}`,
        Subject_Business: job.businessName || '',
        Inspector_Name: inspector.name || '',
        Inspection_Rate: fee === '' || fee == null ? '' : `$${Number(fee).toFixed(2)}`,
        location_count: job.locationCount == null ? '' : String(job.locationCount),
        Business_Address: job.businessAddress || '',
        Business_City: [job.city, [job.state, job.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        Contact_Name: job.name || '',
        Contact_Email: job.subjectContactEmail || '',
        Contact_Phone: job.subjectContactPhone || '',
    };
}

// Bounds measured from the supplied original. Only placeholder text is masked.
const placeholders = [
    ['Value_Date', 478.1925, 659.1728, 61.8336, 13.404],
    ['Reference_Number', 435.2807, 645.1728, 104.724, 13.404],
    ['Subject_Business', 300.1176, 603.1728, 95.3952, 13.404, 240],
    ['Subject_Business', 225.5, 415.1728, 95.3952, 13.654, 300],
    ['Inspector_Name', 72, 575.1728, 88.0452, 13.404],
    ['Inspection_Rate', 204.0528, 463.1728, 86.7264, 13.404],
    ['location_count', 427.4976, 463.1728, 77.3976, 13.404],
    ['Business_Address', 225.5, 392.5654, 99.3912, 13.654, 300],
    ['Business_City', 225.5, 369.958, 76.0344, 13.654, 300],
    ['Contact_Name', 225.5, 347.3505, 80.04, 13.654, 300],
    ['Contact_Email', 225.5, 324.7431, 78.036, 13.654, 300],
    ['Contact_Phone', 225.5, 302.1357, 82.7304, 13.654, 300],
];

export async function generateInspectionRequest(job, inspector, sections, templateBytes) {
    if (!templateBytes) {
        const response = await fetch(INSPECTION_REQUEST_TEMPLATE);
        if (!response.ok) throw new Error('Unable to load the inspection request template.');
        templateBytes = await response.arrayBuffer();
    }
    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPages()[0];
    const form = pdf.getForm();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const values = inspectionRequestValues(job, inspector, sections);
    placeholders.forEach(([name, x, y, maskWidth, height, width = maskWidth], index) => {
        page.drawRectangle({ x: x - 0.5, y: y - 0.5, width: maskWidth + 1, height: height + 1, color: rgb(1, 1, 1) });
        const field = form.createTextField(`${name}_${index}`);
        field.addToPage(page, { x, y, width, height, borderWidth: 0, backgroundColor: undefined, borderColor: undefined, textColor: rgb(0, 0, 0) });
        const text = values[name];
        field.setText(text);
        field.setFontSize(text ? Math.min(11, (width - 4) / font.widthOfTextAtSize(text, 1)) : 11);
    });
    form.updateFieldAppearances(font);
    return new Blob([await pdf.save()], { type: 'application/pdf' });
}

export function inspectorJobEmail(job, inspector) {
    const reference = job.referenceNumber || `JOB-${String(job.id).padStart(6, '0')}`;
    const address = [job.businessAddress, job.city, job.state, job.zipCode].filter(Boolean).join(', ');
    return {
        to: inspector.email || '',
        subject: `Inspection Request – ${job.businessName || '[Business name]'} – ${reference}`,
        body: `${inspector.name?.trim().split(/\s+/)[0] || '[Inspector first name]'},\n\nPlease review the attached Machinery & Equipment Inspection Request for ${job.businessName || '[Business name]'}.\n\nLocation: ${address || '[Business address]'}\nContact: ${job.name || '[Contact name]'}\nPhone: ${job.subjectContactPhone || '[Contact phone]'}\nEmail: ${job.subjectContactEmail || '[Contact email]'}\n\nPlease confirm your availability and review the inspection requirements and fee in the attached request.\n\nRef.: ${reference}\n\nThank you,\nBison Valuation`,
    };
}
