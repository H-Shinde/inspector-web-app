import { apiRequest, apiWrite, AuthError } from './authApi';
import { getBidSections } from './bidSections';

export function bidPayload(values) {
  const fields = new Set(getBidSections(values.appraisalType).flatMap(([, entries]) => entries.map(([field]) => field)));
  return Object.fromEntries(Object.entries(values).filter(([key]) => (fields.has(key) && !['status', 'referenceNumber', 'totalBid'].includes(key))));
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

// Maps a client record from the server to the client fields used on a bid.
export const clientToBidFields = (client) => ({
  clientCompany: client.businessName ?? client.company ?? client.companyName ?? '',
  clientName: client.name ?? client.contactName ?? '',
  clientStreetAddress: client.streetAddress ?? client.address ?? '',
  clientCity: client.city ?? '',
  clientState: client.state ?? '',
  clientZipCode: client.zipCode ?? client.zip ?? '',
  clientPhone: client.phone ?? '',
  clientEmail: client.email ?? '',
});
export const listClients = (signal) => apiRequest('/api/clients/', { signal }).then((data) => data.clients);

export const createBidInspector = (data) => apiWrite('/api/bids/inspectors/', data);
export const createClient = (values) => apiWrite('/api/clients/', values);
