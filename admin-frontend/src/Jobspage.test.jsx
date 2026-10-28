import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Jobspage from './Jobspage';
import { getJob, updateJob } from './jobsApi';
jest.mock('./jobsApi', () => ({ getJob: jest.fn(), listJobs: jest.fn(), updateJob: jest.fn() }));
jest.mock('./useInspectorDirectory', () => () => ({ inspectors: [{ id: 7, name: 'Database Inspector', distanceMiles: 2 }], loading: false, error: '' }));
jest.mock('./SendJobToInspector', () => () => null);
jest.mock('./ItemImage', () => () => null);
jest.mock('datatables.net-react', () => {
    const Table = ({ data, slots }) => <div>{data.map((item) => <div key={item.itemId}>{item.name}{slots?.[6]?.(null, null, item)}</div>)}</div>;
    Table.use = () => {}; return Table;
});
jest.mock('datatables.net-dt', () => ({}));
let saved;
beforeEach(() => {
    jest.clearAllMocks(); sessionStorage.clear();
    window.history.replaceState(null, '', '/Jobspage?jobId=42');
    saved = { id: 42, sourceBidId: 52, referenceNumber: 'JOB-000042', name: 'Contact', businessName: 'Database Job', status: 'Unassigned', inspector: '', inspectorId: null, items: [], sectionDetails: {}, revision: 0 };
    getJob.mockImplementation(async () => saved);
    updateJob.mockImplementation(async (id, changes) => {
        const sectionDetails = { ...saved.sectionDetails };
        for (const [section, values] of Object.entries(changes.sectionDetails || {})) sectionDetails[section] = { ...sectionDetails[section], ...values };
        saved = { ...saved, ...changes, sectionDetails, revision: saved.revision + 1 };
        if (changes.inspectorId === 7) { saved.inspector = 'Database Inspector'; saved.status = 'Assigned'; }
        return saved;
    });
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'new-item-id' } });
});
async function open() { render(<Jobspage />); await screen.findByDisplayValue('Contact'); }
test('loads the server job instead of browser demo data', async () => {
    sessionStorage.setItem('availableJobs', JSON.stringify([{ id: 42, name: 'Stale browser job' }]));
    await open();
    expect(getJob).toHaveBeenCalledWith('42', expect.anything());
    expect(screen.queryByDisplayValue('Stale browser job')).not.toBeInTheDocument();
});
test('saves numeric section edits sequentially with current revisions', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Valuation & Fees' }));
    fireEvent.change(screen.getByLabelText('Total Appraisal'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Total'), { target: { value: '150' } });
    await waitFor(() => expect(updateJob).toHaveBeenCalledTimes(2));
    expect(updateJob.mock.calls[0][1]).toMatchObject({ revision: 0, sectionDetails: { 'Inspection Fees': { totalAppraisal: '100' } } });
    expect(updateJob.mock.calls[1][1]).toMatchObject({ revision: 1, sectionDetails: { 'Inspection Fees': { total: '150' } } });
    expect(sessionStorage.getItem('jobSectionDetails')).toBeNull();
});
test('assigns a database inspector on the job', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Assign Inspector' }));
    fireEvent.change(screen.getByLabelText('Assign inspector'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign inspector' }));
    await waitFor(() => expect(updateJob).toHaveBeenCalledWith(42, { inspectorId: 7, revision: 0 }));
});
test('adds an item through Django and closes only after success', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Forklift' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    await screen.findByText('Forklift');
    expect(updateJob).toHaveBeenCalledWith(42, { revision: 0, items: [{ name: 'Forklift', itemId: 'new-item-id' }] });
    expect(sessionStorage.getItem('jobItems')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('retains item draft when saving fails', async () => {
    updateJob.mockRejectedValueOnce(new Error('Server unavailable'));
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Forklift' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    await screen.findByText('Unable to save the item. Please try again.');
    expect(screen.getByLabelText('Name')).toHaveValue('Forklift');
});
test('does not save negative fees', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Valuation & Fees' }));
    fireEvent.change(screen.getByLabelText('Total Appraisal'), { target: { value: '-1' } });
    expect(updateJob).not.toHaveBeenCalled();
});
test('shows load errors and retries', async () => {
    getJob.mockRejectedValueOnce(new Error('Job not found'));
    render(<Jobspage />); expect(await screen.findByRole('alert')).toHaveTextContent('Job not found');
    fireEvent.click(screen.getByRole('button', { name: 'Reload job' }));
    await screen.findByDisplayValue('Contact');
});

test('edits and deletes items through the job API', async () => {
    saved.items = [{ itemId: 'item-1', name: 'Old item' }];
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Old item' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated item' } });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(saved.items[0].name).toBe('Updated item');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Updated item' }));
    await waitFor(() => expect(screen.queryByText('Updated item')).not.toBeInTheDocument());
    expect(saved.items).toEqual([]);
});
test('imports CSV items into Django', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    const file = new File(['Name,Year\nCSV Forklift,2020'], 'items.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Upload items CSV'), { target: { files: [file] } });
    await screen.findByText('CSV Forklift');
    expect(saved.items[0]).toMatchObject({ name: 'CSV Forklift', year: '2020' });
});
test('completed jobs display read-only item controls', async () => {
    saved.status = 'Complete';
    await open();
    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    expect(screen.getByRole('button', { name: '+ Add item' })).toBeDisabled();
});
