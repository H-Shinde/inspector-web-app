import { listInspectors } from './inspectorApi';
jest.mock('./inspectorApi', () => ({ listInspectors: jest.fn() }));
import { getBidSettings } from './bidSettingsApi';
import { defaultCalculationRules } from './bidCalculation';
jest.mock('./bidSettingsApi', () => ({ getBidSettings: jest.fn() }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddBidpage from './AddBidpage';
import { listClients, listBidInspectors } from './bidsApi';
jest.mock('./bidsApi', () => ({ ...jest.requireActual('./bidsApi'), listClients: jest.fn(), listBidInspectors: jest.fn() }));
test('selecting a database client fills the bid client fields', async () => {
    listInspectors.mockResolvedValue({ inspectors: [] });
    getBidSettings.mockResolvedValue({ rules: defaultCalculationRules });
    listClients.mockResolvedValue([{ id: 42, name: 'Avery', businessName: 'Example Co', email: 'avery@example.com', phone: '202-555-0101', streetAddress: '100 Main Street', city: 'Boston', state: 'MA', zipCode: '02108' }]);
    listBidInspectors.mockResolvedValue([]);
    render(<AddBidpage />);
    const search = screen.getByRole('combobox', { name: 'Search client by name' });
    await waitFor(() => expect(search).toBeEnabled());
    fireEvent.change(search, { target: { value: 'ave' } });
    fireEvent.click(screen.getByRole('option', { name: /Avery/ }));
    expect(document.getElementById('add-clientCompany')).toHaveValue('Example Co');
    expect(document.getElementById('add-clientName')).toHaveValue('Avery');
    expect(document.getElementById('add-clientEmail')).toHaveValue('avery@example.com');
    expect(document.getElementById('add-clientZipCode')).toHaveValue('02108');

});
