import { apiRequest, apiWrite, AuthError } from './authApi';
import { getBidSections } from './bidSections';

export function bidPayload(values) {
  const fields = new Set(getBidSections(values.appraisalType).flatMap(([, entries]) => entries.map(([field]) => field)));
  return Object.fromEntries(Object.entries(values).filter(([key]) => (fields.has(key) && !['status', 'referenceNumber', 'totalBid'].includes(key)) || key === 'inspectorId'));
}
export const listBids = (signal, history = false) => apiRequest(`/api/bids/${history ? '?history=1' : ''}`, { signal }).then((data) => data.bids);
export const listBidInspectors = (signal) => apiRequest('/api/bids/inspectors/', { signal }).then((data) => data.inspectors);
export const getBid = (id, signal) => apiRequest(`/api/bids/${encodeURIComponent(id)}/`, { signal });
export const createServerBid = (values) => apiWrite('/api/bids/', bidPayload(values));
export const updateBid = (id, values) => apiWrite(`/api/bids/${encodeURIComponent(id)}/`, bidPayload(values), { method: 'PATCH' });
export const decideBid = (id, status) => apiWrite(`/api/bids/${encodeURIComponent(id)}/`, { status }, { method: 'PATCH' });
export const deleteBid = (id) => apiWrite(`/api/bids/${encodeURIComponent(id)}/`, undefined, { method: 'DELETE' });
export function uploadBidAgreement(bid, blob) {
  const form = new FormData();
  form.append('agreement', blob, `${bid.referenceNumber}-engagement-agreement.pdf`);
  return apiWrite(`/api/bids/${bid.id}/agreement/`, form, { multipart: true });
}
export async function readBidAgreement(id) {
  const response = await fetch(`/api/bids/${encodeURIComponent(id)}/agreement/`, { credentials: 'include' });
  if (!response.ok) throw new AuthError('Unable to download this agreement. Please try again.', response.status);
  return response.blob();
}

export const createBidInspector = (data) => apiWrite('/api/bids/inspectors/', data);
