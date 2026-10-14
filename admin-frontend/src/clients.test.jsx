import { fireEvent, render, screen, within } from '@testing-library/react';
import Clients from './clients';
jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data, slots }, ref) => <div>{data.map((row) => <div key={row.id}><span>{row.name}</span>{slots[5](null, null, row)}</div>)}</div>);
    Table.use = () => {};
    return Table;
});
jest.mock('datatables.net-dt', () => ({ render: { text: () => undefined } }));
beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});
test('adds, edits, views, and deletes a client with session persistence', () => {
    const { unmount } = render(<Clients />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Client' }));
    let popup = within(screen.getByRole('dialog'));
    fireEvent.change(popup.getByLabelText('Name'), { target: { value: 'Riley Stone' } });
    fireEvent.change(popup.getByLabelText('Email'), { target: { value: 'riley@example.com' } });
    fireEvent.click(popup.getByRole('button', { name: 'Save Client' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Riley Stone' }));
    popup = within(screen.getByRole('dialog'));
    fireEvent.change(popup.getByLabelText('Status'), { target: { value: 'Accepted' } });
    fireEvent.change(popup.getByLabelText('City, State, Zip'), { target: { value: 'Boston, MA 02108' } });
    fireEvent.click(popup.getByRole('button', { name: 'Save Client' }));
    expect(JSON.parse(localStorage.getItem('clients')).find((row) => row.name === 'Riley Stone')).toMatchObject({ status: 'Accepted', email: 'riley@example.com', cityStateZip: 'Boston, MA 02108' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete Riley Stone' }));
    expect(screen.queryByRole('button', { name: 'View Riley Stone' })).toBeNull();
    unmount();
    render(<Clients />);
    expect(screen.queryByRole('button', { name: 'View Riley Stone' })).toBeNull();
});
