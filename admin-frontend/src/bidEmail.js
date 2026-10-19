import { calculateTotalBid } from './bidFields';

export function businessValuationEmail(bid) {
    const firstName = bid.clientName?.trim().split(/\s+/)[0] || '[Client first name]';
    const days = bid.completionDays ? `${bid.completionDays} business days` : '[completion time]';
    return {
        to: bid.clientEmail?.trim() || '',
        subject: `Business Valuation Bid – ${bid.businessName || '[Business name]'}`,
        body: `${firstName},\n\nBison Valuation can complete a USPAP ${bid.reportFormat || '[Report type]'} report of ${bid.businessName || '[Business name]'} for\n$${calculateTotalBid(bid)} completed in ${days}, from a signed Engagement Agreement.\n\nBison Valuation is accredited by 2 separate business valuation societies, the National\nAssociation of Certified Valuators and Analysts and the International Society of\nBusiness Appraisers.\n\nRef.: ${bid.referenceNumber || '[Reference number]'}`,
    };
}

export function machineryEquipmentEmail(bid) {
    const firstName = bid.clientName?.trim().split(/\s+/)[0] || '[Client first name]';
    const days = bid.completionDays ? `${bid.completionDays} business days` : '[completion time]';
    const fee = bid.bidAmount === '' || bid.bidAmount == null ? '[M&E bid]' : `$${Number(bid.bidAmount).toFixed(2)}`;
    return {
        to: bid.clientEmail?.trim() || '',
        subject: `Machinery & Equipment Bid – ${bid.businessName || '[Business name]'}`,
        body: `${firstName},\n\nAfter reviewing the Equipment List for ${bid.businessName || '[Business name]'}, I have determined that I can provide you with a\n${bid.reportFormat || '[Report type]'} Certified Machinery and Equipment Appraisal for ${bid.rushNotes ? `${bid.rushNotes} ` : ''}${fee}.\nI can have this report completed in ${days}.\n\nRef.: ${bid.referenceNumber || '[Reference number]'}\n\nThank you,`,
    };
}

export function bidEmailLink(email) {
    return `mailto:${encodeURIComponent(email.to.trim())}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
}
