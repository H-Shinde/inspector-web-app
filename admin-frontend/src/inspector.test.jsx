import { fireEvent, render, screen } from '@testing-library/react';
import Inspector from './inspector';

jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data, slots }, ref) => <div>{data.map((row) => <div key={row.id}><span>{row.name}</span>{slots[6](null, null, row)}</div>)}</div>);
    Table.use = () => {};
    return Table;
});
jest.mock('datatables.net-dt', () => ({ render: { text: () => undefined } }));

beforeEach(() => {
    sessionStorage.clear();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('records an invited inspector and restores them after reload', () => {
    const { unmount } = render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: '+ Invite Inspector' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Inspector' }), { target: { value: 'Riley Stone' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'riley@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    expect(screen.getByText('Riley Stone')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('invitedInspectors'))[0]).toMatchObject({ name: 'Riley Stone', status: 'Invited', focus: 'Inspection' });
    unmount();
    render(<Inspector />);
    expect(screen.getByText('Riley Stone')).toBeTruthy();
});

test('selects and deselects an inspector', () => {
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Alex Morgan' }));
    expect(sessionStorage.getItem('selectedInspectorId')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Select Alex Morgan' }));
    expect(sessionStorage.getItem('selectedInspectorId')).toBeNull();

});

test('selecting an inspector saves the assignment for the current job only', () => {
    const jobs = [{ id: 21, name: 'Current job', inspector: 'Jordan Lee' }, { id: 22, name: 'Other job', inspector: 'Taylor Brooks' }];
    sessionStorage.setItem('availableJobs', JSON.stringify(jobs));
    sessionStorage.setItem('selectedJob', JSON.stringify(jobs[0]));
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Alex Morgan' }));
    expect(JSON.parse(sessionStorage.getItem('jobAssignments'))).toEqual([{ jobId: 21, inspector: 'Alex Morgan' }]);
    expect(JSON.parse(sessionStorage.getItem('selectedJob')).inspector).toBe('Alex Morgan');
    expect(JSON.parse(sessionStorage.getItem('availableJobs'))[1].inspector).toBe('Taylor Brooks');
});
