import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JobHomepage from './Jobspagehomepage';
import { listJobs, finishJob, deleteJob, importJobs } from './jobsApi';
jest.mock('./jobsApi', () => ({ listJobs: jest.fn(), finishJob: jest.fn(), deleteJob: jest.fn(), importJobs: jest.fn() }));
jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data, slots }, ref) => {
        React.useImperativeHandle(ref, () => ({ dt: () => ({ row: (tr) => ({ data: () => data.find((row) => String(row.id) === tr.dataset.id) }) }) }));
        return <table><tbody>{data.map((row) => <tr data-id={row.id} key={row.id}><td>{row.name}</td><td>{slots[4](null, null, row)}</td><td>{slots[5](null, null, row)}</td><td>{slots[7](null, null, row)}</td></tr>)}</tbody></table>;
    });
    Table.use = () => {}; return Table;
});
jest.mock('datatables.net-dt', () => ({}));
jest.mock('datatables.net-select-dt', () => ({}));
jest.mock('datatables.net-responsive-dt', () => ({}));
const job = { id: 42, name: 'Database Job', status: 'Unassigned', inspector: '', revision: 0 };
beforeEach(() => {
    jest.clearAllMocks(); sessionStorage.clear();
    listJobs.mockResolvedValue([job]); finishJob.mockResolvedValue({ ...job, status: 'Complete' }); deleteJob.mockResolvedValue({ ...job, status: 'Deleted' });
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});
test('loads database jobs without inserting sample jobs', async () => {
    render(<JobHomepage />);
    await screen.findByText('Database Job'); expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('availableJobs')).toBeNull();
});
test('imports a jobs CSV directly from the toolbar and refreshes the list', async () => {
    importJobs.mockImplementation(async () => {
        listJobs.mockResolvedValue([job, { ...job, id: 43, name: 'Imported Job' }]);
        return { imported: 1 };
    });
    render(<JobHomepage />);
    await screen.findByText('Database Job');
    expect(screen.queryByRole('button', { name: /add jobs/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload CSV' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Jobs CSV file'), { target: { files: [{
        size: 200,
        text: async () => 'Reference #,Appraisal Type,Client,Business Name,Client Name,Date,Client Email,Total Bid\nOLD-43,Business Valuation,Bank,Imported Job,Alex,2026-11-18,alex@example.com,1250.00',
    }] } });
    expect(await screen.findByText('Imported 1 job.')).toBeInTheDocument();
    expect(await screen.findByText('Imported Job')).toBeInTheDocument();
    expect(importJobs).toHaveBeenCalledWith([expect.objectContaining({ externalReference: 'OLD-43', businessName: 'Imported Job' })]);
});
test('confirms completion and persists before redirecting', async () => {
    const original = window.location; delete window.location; window.location = { href: '' };
    try {
        render(<JobHomepage />); await screen.findByText('Database Job');
        fireEvent.click(screen.getByRole('button', { name: 'Mark job for Database Job complete' }));
        expect(finishJob).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Complete job' }));
        await waitFor(() => expect(window.location.href).toBe('/History'));
        expect(finishJob).toHaveBeenCalledWith(job);
    } finally { window.location = original; }
});
test('archives a job on the server and refreshes the active list', async () => {
    render(<JobHomepage />); await screen.findByText('Database Job');
    fireEvent.click(screen.getByRole('button', { name: 'Delete job for Database Job' }));
    listJobs.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete job' }));
    await waitFor(() => expect(screen.queryByText('Database Job')).not.toBeInTheDocument());
    expect(deleteJob).toHaveBeenCalledWith(job);
});
test('displays load errors and retries', async () => {
    listJobs.mockRejectedValueOnce(new Error('Unable to load jobs'));
    render(<JobHomepage />); expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load jobs');
    fireEvent.click(screen.getByRole('button', { name: 'Reload jobs' })); await screen.findByText('Database Job');
});
