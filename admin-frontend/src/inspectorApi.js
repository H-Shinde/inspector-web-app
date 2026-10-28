import { apiRequest, apiWrite } from './authApi';
export function listInspectors({ zipCode, clientId, includeInactive = false } = {}, signal) {
    const query = new URLSearchParams();
    if (clientId) query.set('clientId', clientId);
    else if (zipCode) query.set('zipCode', zipCode);
    if (includeInactive) query.set('includeInactive', '1');
    return apiRequest(`/api/inspectors/${query.size ? `?${query}` : ''}`, { signal });
}
export const createInspector = (draft) => apiWrite('/api/inspectors/', draft);
export const updateInspector = (id, draft) => apiWrite(`/api/inspectors/${encodeURIComponent(id)}/`, draft, { method: 'PATCH' });
export const getInspector = (id, signal) => apiRequest(`/api/inspectors/${encodeURIComponent(id)}/`, { signal });
