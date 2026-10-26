import { fireEvent, render, screen } from '@testing-library/react';
import AddBidpage from './AddBidpage';
import { listClients, listBidInspectors } from './bidsApi';
jest.mock('./bidsApi', () => ({ ...jest.requireActual('./bidsApi'), listClients: jest.fn(), listBidInspectors: jest.fn() }));
test('selecting a database client fills the bid client fields', async () => {
    listClients.mockResolvedValue([{ id: 42, name: 'Avery', businessName: 'Example Co', email: 'avery@example.com', phone: '202-555-0101', streetAddress: '100 Main Street', city: 'Boston', state: 'MA', zipCode: '02108' }]);
    listBidInspectors.mockResolvedValue([]);
    render(<AddBidpage />);
    await screen.findByRole('option', { name: 'Example Co – Avery' });
    fireEvent.change(screen.getByLabelText('Select client'), { target: { value: '42' } });
    expect(document.getElementById('add-clientCompany')).toHaveValue('Example Co');
    expect(document.getElementById('add-clientName')).toHaveValue('Avery');
    expect(document.getElementById('add-clientEmail')).toHaveValue('avery@example.com');
    expect(document.getElementById('add-clientZipCode')).toHaveValue('02108');
});
