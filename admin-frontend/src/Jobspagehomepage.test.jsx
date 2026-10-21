import { fireEvent, render, screen } from '@testing-library/react';
import JobHomepage from './Jobspagehomepage';

jest.mock('datatables.net-react', () => {
    const Table = ({ data, slots }) => <div>{data.map((row) => <div key={row.id}>{row.name}{slots[4](null, null, row)}{slots[5](null, null, row)}</div>)}</div>;
    Table.use = () => {};
    return Table;
});
jest.mock('datatables.net-dt', () => ({}));
jest.mock('datatables.net-select-dt', () => ({}));
jest.mock('datatables.net-responsive-dt', () => ({}));

beforeEach(() => {
    sessionStorage.clear();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('asks for confirmation before completing a job, and Cancel changes nothing', () => {
    const location = window.location;
    delete window.location;
    window.location = { href: '' };
    try {
        render(<JobHomepage />);
        fireEvent.click(screen.getByRole('button', { name: 'Mark job for John Doe complete' }));
        expect(screen.getByRole('heading', { name: 'Mark this job complete?' })).toBeInTheDocument();
        expect(sessionStorage.getItem('completedJobs')).toBeNull();
        expect(window.location.href).toBe('');
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('heading', { name: 'Mark this job complete?' })).not.toBeInTheDocument();
        expect(sessionStorage.getItem('completedJobs')).toBeNull();
        expect(window.location.href).toBe('');
    } finally { window.location = location; }
});

test('completes a job from the table and keeps it out of active jobs after reload', () => {
    const location = window.location;
    delete window.location;
    window.location = { href: '' };
    try {
        const { unmount } = render(<JobHomepage />);
        fireEvent.click(screen.getByRole('button', { name: 'Mark job for John Doe complete' }));
        fireEvent.click(screen.getByRole('button', { name: 'Complete job' }));
        expect(window.location.href).toBe('/History');
        expect(JSON.parse(sessionStorage.getItem('completedJobs'))[0]).toMatchObject({ id: 1, status: 'Complete' });
        unmount();
        render(<JobHomepage />);
        expect(screen.queryByRole('button', { name: 'Mark job for John Doe complete' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark job for Saige Fuentes complete' })).toBeInTheDocument();
        expect(JSON.parse(sessionStorage.getItem('availableJobs')).some((job) => job.id === 1)).toBe(false);
    } finally { window.location = location; }
});


test('shows original status badges without a status dropdown', () => {
    render(<JobHomepage />);
    expect(document.querySelector('.bid_status_assigned')).toHaveTextContent('Assigned');
    expect(screen.queryByLabelText('Job status for John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Submitted to Client')).not.toBeInTheDocument();
});