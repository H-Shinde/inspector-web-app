import { fireEvent, render, screen } from '@testing-library/react';
import Clientspage from './Clientspage';
import { listClients, createClient } from './bidsApi';
jest.mock('./bidsApi', () => ({ listClients: jest.fn(), createClient: jest.fn() }));
const client = { id: 42, name: 'Database Client', businessName: 'Database Company', streetAddress: '100 Main Street', city: 'Boston', state: 'MA', zipCode: '02108', email: 'client@example.com' };
beforeEach(() => {
    jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    listClients.mockResolvedValue([client]);
    createClient.mockResolvedValue({ ...client, id: 43, name: 'New Client' });
    window.history.replaceState(null, '', '/Clientspage?clientId=42');
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
});
test('loads the selected server client and shows separate address fields', async () => {
    render(<Clientspage />);
    expect(await screen.findByLabelText('Name')).toHaveValue('Database Client');
    expect(screen.getByLabelText('Street Address')).toHaveValue('100 Main Street');
    expect(screen.getByLabelText('City')).toHaveValue('Boston');
    expect(screen.getByLabelText('ZIP')).toHaveValue('02108');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});
test('shows missing client rather than substituting browser data', async () => {
    window.history.replaceState(null, '', '/Clientspage?clientId=99');
    render(<Clientspage />);
    expect(await screen.findByText('Client not found.')).toBeInTheDocument();
});
test('creates a new client and selects its server ID', async () => {
    render(<Clientspage />);
    await screen.findByLabelText('Name');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Client' }));
    fireEvent.change(screen.getByLabelText('Name', { selector: '#add-client-name' }), { target: { value: 'New Client' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Client' }));
    expect(await screen.findByText('Client has been added.')).toBeInTheDocument();
    expect(window.location.search).toBe('?clientId=43');
    expect(screen.getByLabelText('Name')).toHaveValue('New Client');
});
test('retries loading errors', async () => {
    listClients.mockRejectedValueOnce(new Error('Server unavailable.'));
    render(<Clientspage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Name')).toHaveValue('Database Client');
});
