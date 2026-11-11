export async function inspectorRequest(path, data) {
    const options = { credentials: 'include' };
    if (data) {
        const csrf = await fetch('/api/auth/inspector-csrf/', options).then((response) => response.json());
        const multipart = data instanceof FormData;
        Object.assign(options, { method: 'POST', headers: { 'X-CSRFToken': csrf.csrfToken, ...(!multipart ? { 'Content-Type': 'application/json' } : {}) }, body: multipart ? data : JSON.stringify(data) });
    }
    const response = await fetch(path, options);
    const result = await response.json();
    if (!response.ok) {
        const error = new Error(result.error || 'Unable to save changes.');
        error.status = response.status;
        throw error;
    }
    if (path.includes('inspector-login/') || path.includes('inspector-logout/')) window.dispatchEvent(new Event('app-session-changed'));
    return result;
}
export function inspectorJob(row) {
    const parts = row.inspectionParts?.length ? row.inspectionParts : (row.items || []).map((item, index) => ({
        id: String(item.itemId || `item-${index}`), name: item.name || '', qty: item.qty || '', type: item.type || '', make: item.make || '', model: item.model || '', serial: item.serialNumber || '', condition: item.condition || '', year: item.year || '', mileage: item.hoursMiles || '', comments: item.comments || '', photos: [],
    }));
    return { ...row, title: row.businessName, address: row.businessAddress, contactName: row.name, email: row.subjectContactEmail,
        status: ({ Complete: 'completed', 'Pending Review': 'pending-review', 'Needs Changes': 'needs-changes', Assigned: 'new', 'In-Progress': 'in-progress', Unassigned: 'new' })[row.status] || 'pending-review', parts };
}
