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

export function createBid(draft) {
    const created = readBidList('createdBids');
    const available = readBidList('availableBids');
    const transferred = readBidList('acceptedJobs');
    const id = Math.max(20, ...[...created, ...available].map((bid) => Number(bid.id) || 0),
        ...transferred.map((job) => Number(job.sourceBidId) || 0)) + 1;
    const bid = { ...draft, id, status: draft.status.trim() || 'Pending' };
    sessionStorage.setItem('createdBids', JSON.stringify([...created, bid]));
    sessionStorage.setItem('availableBids', JSON.stringify([...available, bid]));
    sessionStorage.setItem('selectedBid', JSON.stringify(bid));
    sessionStorage.setItem('createdBidMessage', String(bid.id));
    return bid;
}
