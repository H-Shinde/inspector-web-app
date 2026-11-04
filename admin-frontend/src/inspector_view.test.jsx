import { fireEvent, render, screen } from '@testing-library/react';
import InspectorView from './inspector_view';
import { listInspectors } from './inspectorApi';
jest.mock('./inspectorApi', () => ({ listInspectors: jest.fn() }));
beforeEach(() => {
    jest.clearAllMocks(); window.history.replaceState(null, '', '/InspectorView?inspectorId=42');
    listInspectors.mockResolvedValue({ inspectors: [{ id: 42, name: 'Database Inspector', zipCode: '02108', city: 'Boston', state: 'MA', is_active: true }] });
});
test('reads inspector profile and ZIP from Django', async () => {
    render(<InspectorView />);
    expect(await screen.findByLabelText('Inspector')).toHaveValue('Database Inspector');
    expect(screen.getByLabelText('ZIP')).toHaveValue('02108');
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
});
test('reports list failures and retries', async () => {
    listInspectors.mockRejectedValueOnce(new Error('Unable to load.'));
    render(<InspectorView />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('ZIP')).toHaveValue('02108');
});
