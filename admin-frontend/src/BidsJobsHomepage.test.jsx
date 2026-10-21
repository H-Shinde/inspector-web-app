import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Homepage from './BidsJobsHomepage';
import { listBids, deleteBid } from './bidsApi';
jest.mock('./bidsApi', () => ({ listBids: jest.fn(), deleteBid: jest.fn() }));
jest.mock('datatables.net-react', () => { const React = require('react'); const Table = React.forwardRef(({ data, slots }, ref) => <div>{data.map((row) => <div key={row.id}>{row.name}{slots[5](null, null, row)}</div>)}</div>); Table.use = () => {}; return Table; });
jest.mock('datatables.net-dt', () => ({})); jest.mock('datatables.net-select-dt', () => ({})); jest.mock('datatables.net-responsive-dt', () => ({}));
beforeEach(() => { jest.clearAllMocks(); listBids.mockResolvedValue([{ id: 52, name: 'Database Bid', businessName: 'Example', status: 'Pending' }]); deleteBid.mockResolvedValue({}); HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; }; });
test('lists server bids without demo or cached browser records', async () => {
  sessionStorage.setItem('createdBids', JSON.stringify([{ id: 2, name: 'Stale Bid' }])); render(<Homepage />); await screen.findByText('Database Bid'); expect(screen.queryByText('Stale Bid')).not.toBeInTheDocument(); expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
});
test('shows server failures with retry', async () => {
  listBids.mockRejectedValueOnce(new Error('Unable to load bids')); render(<Homepage />); expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load bids'); fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await screen.findByText('Database Bid');
});
test('archives bids using the backend before redirecting to history', async () => {
  render(<Homepage />); await screen.findByText('Database Bid');
  const location = window.location; delete window.location; window.location = { href: '' };
  try { fireEvent.click(screen.getByRole('button', { name: 'Delete bid for Database Bid' })); fireEvent.click(screen.getByRole('button', { name: 'Delete bid' })); await waitFor(() => expect(window.location.href).toBe('/History')); expect(deleteBid).toHaveBeenCalledWith(52); } finally { window.location = location; }
});
