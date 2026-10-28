import { createJob } from './jobsApi';
jest.mock('./jobsApi', () => ({ createJob: jest.fn() }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Bidspage from './Bidspage';
import { getBid, listBidInspectors, updateBid, decideBid, readBidAgreement } from './bidsApi';
import { downloadAgreement, generateEngagementAgreement } from './engagementAgreement';
jest.mock('./bidsApi', () => ({ getBid: jest.fn(), listBidInspectors: jest.fn(), updateBid: jest.fn(), decideBid: jest.fn(), readBidAgreement: jest.fn() }));
jest.mock('./engagementAgreement', () => ({ ...jest.requireActual('./engagementAgreement'), downloadAgreement: jest.fn(), generateEngagementAgreement: jest.fn() }));
const bid = { id: 52, referenceNumber: 'BID-000052', appraisalType: 'Business Valuation (BV)', name: 'Avery', businessName: 'Example', status: 'Pending', totalBid: '1000.00', inspectorId: 7, inspector: 'Database Inspector', hasAgreement: true, engagementAgreement: 'BID-000052-engagement-agreement.pdf' };
beforeEach(() => {
  jest.clearAllMocks(); createJob.mockResolvedValue({ id: 42, inspector: '', inspectorId: null }); sessionStorage.clear(); localStorage.clear();
  window.history.replaceState(null, '', '/Bidspage?bidId=52');
  getBid.mockResolvedValue(bid); listBidInspectors.mockResolvedValue([{ id: 7, name: 'Database Inspector' }, { id: 8, name: 'New Inspector' }]);
  updateBid.mockImplementation(async (id, values) => ({ ...bid, ...values }));
  decideBid.mockImplementation(async (id, status) => ({ ...bid, status }));
  readBidAgreement.mockResolvedValue(new Blob(['pdf'])); generateEngagementAgreement.mockResolvedValue(new Blob(['pdf']));
  URL.createObjectURL = jest.fn(() => 'blob:agreement'); URL.revokeObjectURL = jest.fn();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
async function open() { render(<Bidspage />); await screen.findByDisplayValue('BID-000052'); }
test('loads the requested database bid without trusting browser edits', async () => {
  localStorage.setItem('bidEdits', JSON.stringify({ 52: { name: 'Stale browser value' } }));
  await open();
  expect(getBid).toHaveBeenCalledWith('52', expect.anything());
  fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
  expect(screen.getByLabelText('Contact Name')).toHaveValue('Avery');
});
test('saves edits through the API and keeps draft on failure', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
  fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'Updated' } });
  updateBid.mockRejectedValueOnce(new Error('Invalid details'));
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByText('Invalid details')).toBeInTheDocument();
  expect(screen.getByLabelText('Contact Name')).toHaveValue('Updated');
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await screen.findByText('Bid information has been saved.');
  expect(updateBid).toHaveBeenCalledWith(52, expect.objectContaining({ name: 'Updated' }));
  expect(localStorage.getItem('bidEdits')).toBeNull();
});
test('changes assignment using database inspectors', async () => {
  await open(); fireEvent.change(screen.getByLabelText('Assigned inspector'), { target: { value: '8' } });
  await waitFor(() => expect(updateBid).toHaveBeenCalledWith(52, expect.objectContaining({ inspectorId: '8' })));
});
test('declines on the server and redirects to history', async () => {
  await open(); const location = window.location; delete window.location; window.location = { href: '' };
  try { fireEvent.click(screen.getByRole('button', { name: 'Decline' })); await waitFor(() => expect(window.location.href).toBe('/History')); expect(decideBid).toHaveBeenCalledWith(52, 'Declined'); }
  finally { window.location = location; }
});
test('accepts on the server before handing the bid to the jobs flow', async () => {
  await open(); const location = window.location; delete window.location; window.location = { href: '' };
  try { fireEvent.click(screen.getByRole('button', { name: 'Accept' })); await waitFor(() => expect(window.location.href).toMatch(/^\/Jobspage\?jobId=/)); expect(decideBid).toHaveBeenCalledWith(52, 'Accepted'); }
  finally { window.location = location; }
});
test('downloads the saved agreement from Django', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Documents' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
  await waitFor(() => expect(downloadAgreement).toHaveBeenCalledWith(expect.any(Blob), 'BID-000052-engagement-agreement.pdf'));
  expect(readBidAgreement).toHaveBeenCalledWith(52);
});
test('switches fields by appraisal type and only enables PDF discount when checked', async () => {
  await open(); fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Machinery & Equipment (M&E)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pricing' })); expect(screen.getByLabelText('M&E Bid')).toBeInTheDocument(); expect(screen.queryByLabelText('Discount')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Appraisal' })); fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Business Valuation (BV)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pricing' })); expect(screen.getByLabelText('Discount')).toBeDisabled(); fireEvent.click(screen.getByLabelText('PDF Only/ No hard copy')); expect(screen.getByLabelText('Discount')).toBeEnabled();
});
test('generates email and PDF from the loaded server bid', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Generate Email' }));
  await screen.findByTitle('Engagement agreement PDF preview'); expect(generateEngagementAgreement).toHaveBeenCalledWith(bid); expect(screen.getByLabelText('Message').value).toContain('BID-000052');
});
test('shows an API error with retry instead of cached bid data', async () => {
  getBid.mockRejectedValueOnce(new Error('Bid not found'));
  render(<Bidspage />); expect(await screen.findByRole('alert')).toHaveTextContent('Bid not found');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await screen.findByDisplayValue('BID-000052');
});

test('accepts a bid without an inspector and creates an unassigned job', async () => {
  const original = window.location;
  delete window.location;
  window.location = { search: '?bidId=52', href: '' };
  try {
    getBid.mockResolvedValue({ ...bid, inspectorId: null, inspector: '' });
    render(<Bidspage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled());
    expect(screen.queryByLabelText('Assigned inspector')).not.toBeInTheDocument();
    expect(listBidInspectors).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(window.location.href).toMatch(/^\/Jobspage\?jobId=/));
    expect(createJob).toHaveBeenCalledWith(52);
    expect(sessionStorage.getItem('acceptedJobs')).toBeNull();
  } finally { window.location = original; }
});
