import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddBidpage from './AddBidpage';
import { listInspectors } from './inspectorApi';
import { listClients, listBidInspectors } from './bidsApi';
import { getBidSettings } from './bidSettingsApi';
import { defaultCalculationRules } from './bidCalculation';
jest.mock('./inspectorApi', () => ({ listInspectors: jest.fn() }));
jest.mock('./bidsApi', () => ({ ...jest.requireActual('./bidsApi'), listClients: jest.fn(), listBidInspectors: jest.fn() }));
jest.mock('./bidSettingsApi', () => ({ getBidSettings: jest.fn() }));
beforeEach(() => {
    jest.clearAllMocks();
    getBidSettings.mockResolvedValue({ rules: defaultCalculationRules });
    listClients.mockResolvedValue([{ id: 42, name: 'Client', businessName: 'Example', zipCode: '10001' }]);
    listBidInspectors.mockResolvedValue([{ id: 1, name: 'Near' }]);
    listInspectors.mockResolvedValue({ inspectors: [{ id: 1, name: 'Near', distanceMiles: 0 }, { id: 2, name: 'Next', distanceMiles: 5.2 }, { id: 3, name: 'Unknown', distanceMiles: null }] });
});
test('client ZIP autofill does not show inspectors on bids', async () => {
    render(<AddBidpage />);
    await screen.findByRole('option', { name: 'Example – Client' });
    fireEvent.change(screen.getByLabelText('Select client'), { target: { value: '42' } });
    expect(screen.queryByLabelText('Assigned inspector (required)')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Closest inspectors/ })).not.toBeInTheDocument();
    expect(listInspectors).not.toHaveBeenCalled();
    expect(listBidInspectors).not.toHaveBeenCalled();
});
test('does not request a distance lookup for invalid ZIP codes', async () => {
    render(<AddBidpage />);
    await screen.findByRole('option', { name: 'Example – Client' });
    fireEvent.change(document.getElementById('add-clientZipCode'), { target: { value: '123' } });
    expect(listInspectors).not.toHaveBeenCalled();
});
