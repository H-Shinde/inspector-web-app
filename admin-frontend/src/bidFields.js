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

export function readBidEdits() {
    try {
        const saved = JSON.parse(localStorage.getItem('bidEdits') || '{}');
        return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
}

export function calculateTotalBid(draft) {
    return ((Math.round(Number(draft.bidAmount || 0) * 100)
        - Math.round(Number(draft.discount || 0) * 100)
        - (draft.rush === true ? Math.round(Number(draft.rushDiscount || 0) * 100) : 0)
        + Math.round(Number(draft.additionalCharges || 0) * 100)) / 100).toFixed(2);
}

export function nextBidId() {
    return Math.max(20, ...[...readBidList('createdBids'), ...readBidList('availableBids')].map((bid) => Number(bid.id) || 0),
        ...readBidList('acceptedJobs').map((job) => Number(job.sourceBidId) || 0)) + 1;
}

export function bidReferenceNumber(id) {
    return `BID-${String(id).padStart(6, '0')}`;
}

export function createBid(draft) {
    const created = readBidList('createdBids');
    const available = readBidList('availableBids');
    const id = nextBidId();
    const bid = { ...draft, id, status: 'Pending', referenceNumber: bidReferenceNumber(id), totalBid: calculateTotalBid(draft) };
    sessionStorage.setItem('createdBids', JSON.stringify([...created, bid]));
    sessionStorage.setItem('availableBids', JSON.stringify([...available, bid]));
    sessionStorage.setItem('selectedBid', JSON.stringify(bid));
    sessionStorage.setItem('createdBidMessage', String(bid.id));
    return bid;
}
