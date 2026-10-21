import { createServerBid, uploadBidAgreement, updateBid, decideBid, deleteBid, listBids, bidPayload } from './bidsApi';
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { delete global.fetch; });
const response = (data) => ({ ok: true, status: 200, json: jest.fn().mockResolvedValue(data) });
function allowWrite(data = { id: 52 }) { fetch.mockResolvedValueOnce(response({ csrfToken: 'token' })).mockResolvedValueOnce(response(data)); }
test('creates bids with cookie authentication, CSRF, and only editable fields', async () => {
  allowWrite(); await createServerBid({ name: 'Avery', businessName: 'Example', inspectorId: 7, status: 'Accepted', referenceNumber: 'FAKE', id: 99, totalBid: '1' });
  const [url, request] = fetch.mock.calls[1]; expect(url).toBe('/api/bids/'); expect(request.credentials).toBe('include'); expect(request.headers['X-CSRFToken']).toBe('token');
  expect(JSON.parse(request.body)).toEqual({ name: 'Avery', businessName: 'Example', inspectorId: 7 });
});
test('M&E payload retains Rush and PDF discount', () => {
  expect(bidPayload({ appraisalType: 'Machinery & Equipment (M&E)', bidAmount: '1000', discount: '100', rush: true, inspectorId: 7 })).toEqual({ appraisalType: 'Machinery & Equipment (M&E)', bidAmount: '1000', discount: '100', rush: true, inspectorId: 7 });
});
test('uploads PDFs as multipart without manually setting Content-Type', async () => {
  allowWrite(); await uploadBidAgreement({ id: 52, referenceNumber: 'BID-000052' }, new Blob(['pdf'], { type: 'application/pdf' }));
  const [url, request] = fetch.mock.calls[1]; expect(url).toBe('/api/bids/52/agreement/'); expect(request.body).toBeInstanceOf(FormData); expect(request.headers['Content-Type']).toBeUndefined(); expect(request.body.get('agreement').name).toBe('BID-000052-engagement-agreement.pdf');
});
test('updates, decisions, deletes, and archives use the correct API URLs', async () => {
  allowWrite(); await updateBid(52, { name: 'Updated' }); expect(fetch.mock.calls[1][1].method).toBe('PATCH');
  fetch.mockReset(); allowWrite(); await decideBid(52, 'Declined'); expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ status: 'Declined' });
  fetch.mockReset(); allowWrite(); await deleteBid(52); expect(fetch.mock.calls[1][1].method).toBe('DELETE');
  fetch.mockReset(); fetch.mockResolvedValueOnce(response({ bids: [] })); await listBids(undefined, true); expect(fetch.mock.calls[0][0]).toBe('/api/bids/?history=1');
});
