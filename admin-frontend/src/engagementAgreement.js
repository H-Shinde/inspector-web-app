import { appraisalTypeLabel } from './appraisalTypes';
import { drawLine, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { calculateTotalBid } from './bidFields';

export const BUSINESS_VALUATION = 'Business Valuation (BV)';
export const MACHINERY_EQUIPMENT = 'Machinery & Equipment (M&E)';
export const AGREEMENT_TEMPLATE = '/agreements/business-valuation-engagement.pdf';
export const MACHINERY_AGREEMENT_TEMPLATE = '/agreements/machinery-equipment-engagement.pdf';

const money = (value) => value === '' || value === undefined || value === null ? '' : `$${Number(value).toFixed(2)}`;

export function agreementValues(bid) {
    return {
        Order_Type: appraisalTypeLabel(bid.appraisalType) || 'Business Valuation',
        Report_Type: bid.reportFormat || '',
        BV_RATE: money(bid.bidAmount),
        RUSH_RATE: bid.rush === true && Number(bid.rushDiscount) > 0 ? `-${money(bid.rushDiscount)}` : '',
        CONS_RATE: '',
        OTHER_RATE: money(bid.additionalCharges),
        PDF_DISC: money(bid.discount),
        BV_BID: money(calculateTotalBid(bid)),
        Company_Name: bid.clientCompany || '',
        Client_Name: bid.clientName || '',
        Company_Street: bid.clientStreetAddress || '',
        Company_City: [bid.clientCity, bid.clientState, bid.clientZipCode].filter(Boolean).join(', '),
        Company_Phone: bid.clientPhone || '',
        Client_Email: bid.clientEmail || '',
        Subject_Business: bid.businessName || '',
        Contact_Name: bid.name || '',
        Business_Address: bid.businessAddress || '',
        Business_City: [bid.city, bid.state, bid.zipCode].filter(Boolean).join(', '),
        Contact_Phone: bid.subjectContactPhone || '',
        Contact_Email: bid.subjectContactEmail || '',
        Reference_Number: bid.referenceNumber,
        reportSelected: Boolean(bid.reportFormat),
        rushSelected: bid.rush === true,
        consolidationSelected: false,
        chargesSelected: Number(bid.additionalCharges) > 0,
        pdfOnlySelected: bid.pdfOnly === true,
        noHardCopySelected: bid.pdfOnly === true,
    };
}

const agreementDate = (value) => (value || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1');

export function machineryAgreementValues(bid) {
    return {
        Property_Type: bid.propertyType || '',
        Subject_Business: bid.businessName || '',
        Business_Address: bid.businessAddress || '',
        Business_City: bid.city || '',
        Contact_Name: bid.name || '',
        Contact_Email: bid.subjectContactEmail || '',
        Contact_Phone: bid.subjectContactPhone || '',
        Value_Date: agreementDate(bid.valueDate),
        Company_Name: bid.clientCompany || '',
        Value_Type: bid.valueType || '',
        MAE_Bid: money(bid.bidAmount),
        business_days: bid.completionDays !== undefined && bid.completionDays !== null && bid.completionDays !== '' ? `${bid.completionDays} business days` : '',
        Request_Date: agreementDate(bid.date),
        Reference_Number: bid.referenceNumber || '',
        onsiteSelected: bid.reportFormat === 'Onsite',
        desktopSelected: bid.reportFormat === 'Desktop',
    };
}

export async function generateEngagementAgreement(bid, templateBytes) {
    const isMachinery = bid.appraisalType === MACHINERY_EQUIPMENT;
    if (!templateBytes) {
        const response = await fetch(isMachinery ? MACHINERY_AGREEMENT_TEMPLATE : AGREEMENT_TEMPLATE);
        if (!response.ok) throw new Error('The engagement agreement template could not be loaded.');
        templateBytes = await response.arrayBuffer();
    }
    const pdf = await PDFDocument.load(templateBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const form = pdf.getForm();
    for (const [name, value] of Object.entries(isMachinery ? machineryAgreementValues(bid) : agreementValues(bid))) {
        if (typeof value === 'boolean') {
            const field = form.getCheckBox(name);
            if (value) field.check(); else field.uncheck();
            // Draw just the tick; the checkbox outline is already printed in the original PDF.
            field.updateAppearances(() => ({ normal: {
                on: [
                    ...drawLine({ start: { x: 1, y: 3 }, end: { x: 3, y: 1 }, thickness: 1, color: rgb(0, 0, 0) }),
                    ...drawLine({ start: { x: 3, y: 1 }, end: { x: 6, y: 6 }, thickness: 1, color: rgb(0, 0, 0) }),
                ],
                off: [],
            } }));
        } else {
            const field = form.getTextField(name);
            const text = value || '';
            const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
            field.setText(text);
            field.setFontSize(text ? Math.min(10, width / font.widthOfTextAtSize(text, 1)) : 10);
        }
    }
    form.updateFieldAppearances(font);
    // Keep uncollected details editable for completion and leave signatures unsigned.
    return new Blob([await pdf.save()], { type: 'application/pdf' });
}

async function agreementStore(mode, operation) {
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('bison-agreements', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('agreements');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction('agreements', mode);
            const request = operation(transaction.objectStore('agreements'));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('Agreement storage was interrupted.'));
        });
    } finally { db.close(); }
}

export const saveAgreement = (referenceNumber, blob) => agreementStore('readwrite', (store) => store.put(blob, referenceNumber));
export const readAgreement = (referenceNumber) => agreementStore('readonly', (store) => store.get(referenceNumber));
export const deleteAgreement = (referenceNumber) => agreementStore('readwrite', (store) => store.delete(referenceNumber));

export function downloadAgreement(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
