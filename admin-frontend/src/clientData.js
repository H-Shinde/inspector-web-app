const demoClients = [
    { id: 1, name: 'Avery Wilson', totalBids: 8, businessName: 'Wilson Equipment', status: 'Accepted', email: 'avery@example.com', phone: '202-555-0101', fax: '202-555-0111', cityStateZip: 'Washington, DC 20001' },
    { id: 2, name: 'Sam Bennett', totalBids: 3, businessName: 'Bennett Logistics', status: 'Pending', email: 'sam@example.com', phone: '202-555-0102', fax: '202-555-0112', cityStateZip: 'Arlington, VA 22201' },
    { id: 3, name: 'Drew Hayes', totalBids: 12, businessName: 'Hayes Manufacturing', status: 'Accepted', email: 'drew@example.com', phone: '202-555-0103', fax: '202-555-0113', cityStateZip: 'Alexandria, VA 22301' },
    {"id": 4, "name": "Morgan Reed", "totalBids": 17, "businessName": "Reed Construction", "status": "Accepted", "email": "morgan.reed@example.com", "phone": "202-555-0104", "fax": "202-555-0154", "cityStateZip": "Baltimore, MD 21201"},
    {"id": 5, "name": "Taylor Brooks", "totalBids": 5, "businessName": "Brooks Fleet Services", "status": "Pending", "email": "taylor.brooks@example.com", "phone": "202-555-0105", "fax": "202-555-0155", "cityStateZip": "Richmond, VA 23219"},
    {"id": 6, "name": "Casey Rivera", "totalBids": 21, "businessName": "Rivera Industrial Supply", "status": "Accepted", "email": "casey.rivera@example.com", "phone": "202-555-0106", "fax": "202-555-0156", "cityStateZip": "Philadelphia, PA 19103"},
    {"id": 7, "name": "Jordan Ellis", "totalBids": 9, "businessName": "Ellis Warehouse Group", "status": "Pending", "email": "jordan.ellis@example.com", "phone": "202-555-0107", "fax": "202-555-0157", "cityStateZip": "Charlotte, NC 28202"},
    {"id": 8, "name": "Riley Parker", "totalBids": 14, "businessName": "Parker Medical Equipment", "status": "Accepted", "email": "riley.parker@example.com", "phone": "202-555-0108", "fax": "202-555-0158", "cityStateZip": "Boston, MA 02108"},
    {"id": 9, "name": "Jamie Chen", "totalBids": 2, "businessName": "Chen Retail Holdings", "status": "Pending", "email": "jamie.chen@example.com", "phone": "202-555-0109", "fax": "202-555-0159", "cityStateZip": "New York, NY 10001"},
    {"id": 10, "name": "Cameron Patel", "totalBids": 26, "businessName": "Patel Energy Services", "status": "Accepted", "email": "cameron.patel@example.com", "phone": "202-555-0110", "fax": "202-555-0160", "cityStateZip": "Pittsburgh, PA 15222"},
    {"id": 11, "name": "Alex Turner", "totalBids": 6, "businessName": "Turner Agriculture", "status": "Pending", "email": "alex.turner@example.com", "phone": "202-555-0111", "fax": "202-555-0161", "cityStateZip": "Lancaster, PA 17602"},
    {"id": 12, "name": "Quinn Foster", "totalBids": 11, "businessName": "Foster Transport", "status": "Accepted", "email": "quinn.foster@example.com", "phone": "202-555-0112", "fax": "202-555-0162", "cityStateZip": "Raleigh, NC 27601"},
    {"id": 13, "name": "Skyler Grant", "totalBids": 4, "businessName": "Grant Hospitality", "status": "Pending", "email": "skyler.grant@example.com", "phone": "202-555-0113", "fax": "202-555-0163", "cityStateZip": "Norfolk, VA 23510"},
    {"id": 14, "name": "Dakota Lewis", "totalBids": 19, "businessName": "Lewis Machine Works", "status": "Accepted", "email": "dakota.lewis@example.com", "phone": "202-555-0114", "fax": "202-555-0164", "cityStateZip": "Columbus, OH 43215"},
    {"id": 15, "name": "Reese Kim", "totalBids": 7, "businessName": "Kim Property Group", "status": "Pending", "email": "reese.kim@example.com", "phone": "202-555-0115", "fax": "202-555-0165", "cityStateZip": "Newark, NJ 07102"},
];
export const fields = [['id', '# ID'], ['name', 'Name'], ['totalBids', 'Total Bids'], ['businessName', 'Business Name'], ['status', 'Status']];
export const detailFields = [...fields, ['email', 'Email'], ['phone', 'Phone'], ['fax', 'Fax'], ['cityStateZip', 'City, State, Zip']];
export function loadClients() {
    try {
        const stored = JSON.parse(localStorage.getItem('clients') ?? sessionStorage.getItem('clients') ?? 'null');
        if (Array.isArray(stored) && !localStorage.getItem('clientsDemoExpanded')) {
            const nextId = Math.max(0, ...stored.map((row) => Number(row.id) || 0)) + 1;
            const expanded = [...stored, ...demoClients.slice(3).map((row, index) => ({ ...row, id: nextId + index }))];
            localStorage.setItem('clients', JSON.stringify(expanded));
            localStorage.setItem('clientsDemoExpanded', 'true');
            return expanded;
        }
        localStorage.setItem('clientsDemoExpanded', 'true');
        return Array.isArray(stored) ? stored : demoClients;
    } catch { return demoClients; }
}
export function saveClients(rows) {
    localStorage.setItem('clients', JSON.stringify(rows));
    window.dispatchEvent(new Event('clients-changed'));
}
export function newClient() {
    return { id: Math.max(0, ...loadClients().map((row) => Number(row.id))) + 1, name: '', totalBids: 0, businessName: '', status: 'Pending', email: '', phone: '', fax: '', cityStateZip: '' };
}
