export async function inspectorRequest(path, data) {
    const options = { credentials: 'include' };
    if (data) {
        const csrf = await fetch('/api/auth/csrf/', options).then((response) => response.json());
        Object.assign(options, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf.csrfToken }, body: JSON.stringify(data) });
    }
    const response = await fetch(path, options);
    const result = await response.json();
    if (!response.ok) {
        const error = new Error(result.error || 'Unable to save changes.');
        error.status = response.status;
        throw error;
    }
    return result;
}
export function inspectorJob(row) {
    const parts = row.inspectionParts?.length ? row.inspectionParts : (row.items || []).map((item, index) => ({
        id: String(item.itemId || `item-${index}`), name: item.name || '', qty: item.qty || '', type: item.type || '', make: item.make || '', model: item.model || '', serial: item.serialNumber || '', condition: '', year: item.year || '', mileage: item.hoursMiles || '', comments: item.comments || '', photos: [],
    }));
    return { ...row, title: row.businessName, address: row.businessAddress, contactName: row.name, email: row.subjectContactEmail,
        status: row.status === 'Complete' ? 'submitted' : row.status === 'Assigned' ? 'new' : 'in-progress', parts };
}
