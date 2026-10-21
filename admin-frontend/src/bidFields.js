export const clientBidFields = [
    ['clientCompany', 'Client Company'],
    ['clientName', 'Client Name'],
    ['clientStreetAddress', 'Client Street Address'],
    ['clientCity', 'Client City'],
    ['clientState', 'Client State'],
    ['clientZipCode', 'Client ZIP Code'],
    ['clientPhone', 'Client Phone', 'tel'],
    ['clientEmail', 'Client Email', 'email'],
];

export const bidFields = [
    ['appraisalType', 'Appraisal type'],
    ['subjectContactPhone', 'Subject contact phone'],
    ['date', 'Inspection request date'],
    ['propertyType', 'Type of property'],
    ['businessName', 'Business name'],
    ['rush', 'Rush'],
    ['name', 'Subject contact name'],
    ['businessAddress', 'Business address'],
    ['pdf', 'PDF'],
    ['discount', 'Discount'],
    ['subjectContactEmail', 'Subject contact e-mail'],
    ['city', 'City'],
    ['state', 'State'],
    ['zipCode', 'ZIP code'],
    ['status', 'Status'],
];

export function readBidList(key) {
    try {
        const value = JSON.parse(sessionStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

export function calculateTotalBid(draft) {
    return ((Math.round(Number(draft.bidAmount || 0) * 100)
        - Math.round(Number(draft.discount || 0) * 100)
        - (draft.rush === true ? Math.round(Number(draft.rushDiscount || 0) * 100) : 0)
        + Math.round(Number(draft.additionalCharges || 0) * 100)) / 100).toFixed(2);
}
