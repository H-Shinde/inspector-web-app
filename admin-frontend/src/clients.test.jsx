import { fireEvent, render, screen } from '@testing-library/react';
import Clients from './clients';
import { listClients, createClient } from './bidsApi';
jest.mock('./bidsApi', () => ({ listClients: jest.fn(), createClient: jest.fn() }));
jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data }, ref) => {
        React.useImperativeHandle(ref, () => ({ dt: () => ({ row: (tr) => ({ data: () => data.find((row) => String(row.id) === tr.dataset.id) }) }) }));
        return <table><tbody>{data.map((row) => <tr key={row.id} data-id={row.id} tabIndex={0}><td>{row.name}</td><td>{row.businessName}</td></tr>)}</tbody></table>;
    });
    Table.use = () => {};
    return Table;
});
jest.mock('datatables.net-dt', () => ({ render: { text: () => undefined } }));
const client = { id: 42, name: 'Database Client', businessName: 'Database Company', state: 'NY' };
beforeEach(() => {
    jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    listClients.mockResolvedValue([client]);
    createClient.mockResolvedValue({ ...client, id: 43, name: 'New Client' });
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    delete window.location; window.location = { href: '', search: '' };
});
async function openAdd() {
    render(<Clients />);
    await screen.findByText('Database Client');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Client' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' New Client ' } });
}
test('loads server records and opens details by server ID without browser records', async () => {
    localStorage.setItem('clients', JSON.stringify([{ id: 99, name: 'Old browser record' }]));
    render(<Clients />);
    fireEvent.click(await screen.findByText('Database Client'));
    expect(screen.queryByText('Old browser record')).not.toBeInTheDocument();
    expect(window.location.href).toBe('/Clientspage?clientId=42');
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
});
test('creates a client with server fields and updates the table only after success', async () => {
    await openAdd();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Total Bids')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'ny' } });
    fireEvent.change(screen.getByLabelText('ZIP'), { target: { value: '10001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Client' }));
    await screen.findByText('New Client');
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Client', state: 'NY', zipCode: '10001' }));
    expect(createClient.mock.calls[0][0]).not.toHaveProperty('id');
    expect(localStorage.getItem('clients')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('retains the draft when saving fails and allows retry', async () => {
    createClient.mockRejectedValueOnce(new Error('Unable to save client.'));
    await openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Save Client' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save client.');
    expect(screen.getByLabelText('Name')).toHaveValue(' New Client ');
    fireEvent.click(screen.getByRole('button', { name: 'Save Client' }));
    await screen.findByText('New Client');
});
test('validates contact information before calling the API', async () => {
    await openAdd();
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Client' }));
    expect(createClient).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Phone:');
});
test('retries list failures', async () => {
    listClients.mockRejectedValueOnce(new Error('Server unavailable.'));
    render(<Clients />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Database Client');
});
test('prevents duplicate submits and closing while saving', async () => {
    let resolve;
    createClient.mockReturnValue(new Promise((done) => { resolve = done; }));
    await openAdd();
    const form = screen.getByRole('form', { name: 'Add client' });
    fireEvent.submit(form); fireEvent.submit(form);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    resolve({ id: 43, name: 'New Client' });
    await screen.findByText('New Client');
});
