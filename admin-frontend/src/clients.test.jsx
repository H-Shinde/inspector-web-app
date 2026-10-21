import { fireEvent, render, screen, within } from '@testing-library/react';
import Clients from './clients';
jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data, slots }, ref) => {
        React.useImperativeHandle(ref, () => ({
            dt: () => ({ row: (tr) => ({ data: () => data.find((row) => String(row.id) === tr.dataset.id) }), column: () => ({ search: () => {} }), draw: () => {} }),
        }));
        return <table><tbody>{data.map((row) => <tr key={row.id} data-id={row.id}><td>{row.name}</td><td>{row.state}</td><td>{slots[6](null, null, row)}</td></tr>)}</tbody></table>;
    });
    Table.use = () => {};
    return Table;
});
jest.mock('datatables.net-dt', () => ({ render: { text: () => undefined } }));
beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    delete window.location;
    window.location = { href: '', search: '' };
});

test('delete is the only row action', () => {
    render(<Clients />);
    expect(screen.getByRole('button', { name: 'Delete Avery Wilson' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit Avery Wilson' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'View Avery Wilson' })).toBeNull();
});

test('adds a client, then deletes only after confirmation', () => {
    const { unmount } = render(<Clients />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Client' }));
    const popup = within(screen.getByLabelText('Add Client', { selector: 'dialog' }));
    fireEvent.change(popup.getByLabelText('Name'), { target: { value: 'Riley Stone' } });
    fireEvent.click(popup.getByRole('button', { name: 'Save Client' }));
    expect(JSON.parse(localStorage.getItem('clients')).some((row) => row.name === 'Riley Stone')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Riley Stone' }));
    const confirm = within(screen.getByLabelText('Delete this client?', { selector: 'dialog' }));
    fireEvent.click(confirm.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Riley Stone')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Riley Stone' }));
    fireEvent.click(within(screen.getByLabelText('Delete this client?', { selector: 'dialog' })).getByRole('button', { name: 'Delete client' }));
    expect(screen.queryByText('Riley Stone')).toBeNull();
    unmount();
    render(<Clients />);
    expect(screen.queryByText('Riley Stone')).toBeNull();
});

test('clicking a row opens that client, but clicking delete does not', () => {
    render(<Clients />);
    fireEvent.click(screen.getByText('Sam Bennett'));
    expect(window.location.href).toBe('/Clientspage?clientId=2');
    window.location.href = '';
    fireEvent.click(screen.getByRole('button', { name: 'Delete Avery Wilson' }));
    expect(window.location.href).toBe('');
});

test('shows State for legacy addresses and saves State for new clients', () => {
    render(<Clients />);
    expect(screen.getByText('Avery Wilson').closest('tr')).toHaveTextContent('DC');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Client' }));
    const popup = within(screen.getByRole('dialog'));
    fireEvent.change(popup.getByLabelText('Name'), { target: { value: 'New Client' } });
    fireEvent.change(popup.getByLabelText('State'), { target: { value: 'NY' } });
    fireEvent.click(popup.getByRole('button', { name: 'Save Client' }));
    expect(screen.getByText('New Client').closest('tr')).toHaveTextContent('NY');
    expect(JSON.parse(localStorage.getItem('clients')).find((client) => client.name === 'New Client').state).toBe('NY');
});
