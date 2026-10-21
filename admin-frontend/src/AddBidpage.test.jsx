import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AddBidpage from './AddBidpage';
import { createServerBid, listBidInspectors, uploadBidAgreement } from './bidsApi';
import { generateEngagementAgreement } from './engagementAgreement';
jest.mock('./bidsApi', () => ({ createServerBid: jest.fn(), listBidInspectors: jest.fn(), uploadBidAgreement: jest.fn() }));
jest.mock('./engagementAgreement', () => ({ ...jest.requireActual('./engagementAgreement'), generateEngagementAgreement: jest.fn() }));
const saved = { id: 52, referenceNumber: 'BID-000052', appraisalType: 'Business Valuation (BV)', name: 'Avery', businessName: 'Example', clientEmail: 'client@example.com', bidAmount: '1000.00', totalBid: '1000.00', date: '2026-10-21', status: 'Pending', inspectorId: 7, inspector: 'Database Inspector' };
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear();
  listBidInspectors.mockResolvedValue([{ id: 7, name: 'Database Inspector' }]);
  createServerBid.mockResolvedValue(saved);
  uploadBidAgreement.mockResolvedValue({ ...saved, hasAgreement: true, engagementAgreement: 'BID-000052-engagement-agreement.pdf' });
  generateEngagementAgreement.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
  URL.createObjectURL = jest.fn(() => 'blob:preview'); URL.revokeObjectURL = jest.fn();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
async function openConfirmation(type = 'Business Valuation (BV)') {
  render(<AddBidpage />);
  await screen.findByRole('option', { name: 'Database Inspector' });
  fireEvent.change(screen.getByLabelText('Assigned inspector (required)'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: type } });
  fireEvent.change(screen.getByLabelText('Business Name'), { target: { value: 'Example' } });
  fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'Avery' } });
  if (type.startsWith('Machinery')) fireEvent.change(screen.getByLabelText('Report Format'), { target: { value: 'Desktop' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Add Bid' }));
}
test('loads database inspectors and waits for confirmation without creating a bid', async () => {
  await openConfirmation();
  expect(screen.getByLabelText('Reference Number')).toHaveValue('Assigned when bid is created');
  expect(createServerBid).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Business Name')).toHaveValue('Example');
});
test('creates the bid first then generates and uploads a PDF with the server reference', async () => {
  await openConfirmation();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
  await screen.findByRole('button', { name: 'Download Agreement PDF' });
  expect(createServerBid).toHaveBeenCalledWith(expect.objectContaining({ inspectorId: 7, inspector: 'Database Inspector', businessName: 'Example' }));
  expect(generateEngagementAgreement).toHaveBeenCalledWith(saved);
  expect(uploadBidAgreement).toHaveBeenCalledWith(saved, expect.any(Blob));
  expect(screen.getByLabelText('Message').value).toContain('BID-000052');
  expect(sessionStorage.getItem('createdBids')).toBeNull();
});
test('does not generate an agreement or report success when the server rejects a bid', async () => {
  createServerBid.mockRejectedValue(new Error('Inspector is not available.'));
  await openConfirmation();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Inspector is not available');
  expect(generateEngagementAgreement).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Download Agreement PDF' })).not.toBeInTheDocument();
});
test('retries a failed PDF upload without creating a duplicate bid', async () => {
  uploadBidAgreement.mockRejectedValueOnce(new Error('Network'));
  await openConfirmation();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your bid was saved');
  fireEvent.click(screen.getByRole('button', { name: 'Retry Agreement' }));
  await screen.findByRole('button', { name: 'Download Agreement PDF' });
  expect(createServerBid).toHaveBeenCalledTimes(1);
  expect(uploadBidAgreement).toHaveBeenCalledTimes(2);
});
test('M&E excludes hidden pricing and previews without saving', async () => {
  await openConfirmation('Machinery & Equipment (M&E)');
  expect(screen.queryByLabelText('Discount')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View PDF' }));
  await screen.findByTitle('Engagement agreement PDF preview');
  expect(createServerBid).not.toHaveBeenCalled();
  expect(generateEngagementAgreement).toHaveBeenCalledWith(expect.objectContaining({ reportFormat: 'Desktop', referenceNumber: '' }));
});
test('discount controls and Rush stay grouped in Pricing', async () => {
  await openConfirmation(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  const pricing = within(screen.getByRole('group', { name: 'Pricing' }));
  expect(pricing.getByLabelText('Discount')).toBeDisabled();
  fireEvent.click(pricing.getByLabelText('PDF Only/ No hard copy'));
  expect(pricing.getByLabelText('Discount')).toBeEnabled();
  expect(pricing.getByLabelText('Rush Discount')).toBeDisabled();
  fireEvent.click(pricing.getByLabelText('Rush'));
  expect(pricing.getByLabelText('Rush Discount')).toBeEnabled();
});
test('reports inspector-loading errors and supports retry', async () => {
  listBidInspectors.mockRejectedValueOnce(new Error('Unable to connect.'));
  render(<AddBidpage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect');
  expect(screen.getByRole('button', { name: '+ Add Bid' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('option', { name: 'Database Inspector' });
  expect(screen.getByRole('button', { name: '+ Add Bid' })).toBeEnabled();
});


test('allows selecting a sample inspector without an add inspector option', async () => {
  listBidInspectors.mockResolvedValueOnce([{ id: 9, name: 'Alex Morgan' }]);
  render(<AddBidpage />);
  await screen.findByRole('option', { name: 'Alex Morgan' });
  fireEvent.change(screen.getByLabelText('Assigned inspector (required)'), { target: { value: '9' } });
  expect(screen.getByLabelText('Assigned inspector (required)')).toHaveValue('9');
  expect(screen.queryByRole('button', { name: /add inspector/i })).not.toBeInTheDocument();
  expect(createServerBid).not.toHaveBeenCalled();
});
