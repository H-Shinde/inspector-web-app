import { fireEvent, render, screen, within } from '@testing-library/react';
import Settings from './Settings';
import { getBidSettings, saveBidSettings } from './bidSettingsApi';
import { defaultCalculationRules, calculationTypes } from './bidCalculation';
jest.mock('./bidSettingsApi', () => ({ getBidSettings: jest.fn(), saveBidSettings: jest.fn() }));
const response = () => ({
    rules: JSON.parse(JSON.stringify(defaultCalculationRules)), defaults: JSON.parse(JSON.stringify(defaultCalculationRules)), types: calculationTypes,
    fields: [{ field: 'bidAmount', label: 'Appraisal fee' }, { field: 'discount', label: 'PDF discount' }, { field: 'rush', label: 'Rush checkbox', checkbox: true }, { field: 'pdfOnly', label: 'PDF Only checkbox', checkbox: true }],
});
beforeEach(() => { jest.clearAllMocks(); getBidSettings.mockResolvedValue(response()); saveBidSettings.mockImplementation(async (rules) => ({ ...response(), rules })); });
test('changes a formula, previews checkbox fees and saves all bid types', async () => {
    render(<Settings />);
    await screen.findByLabelText('Bid type');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    fireEvent.change(screen.getByLabelText('Appraisal fee multiplier'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Rush checkbox operation'), { target: { value: 'add' } });
    fireEvent.change(screen.getByLabelText('Rush checkbox multiplier'), { target: { value: '100' } });
    fireEvent.click(within(screen.getByRole('region', { name: 'Calculation preview' })).getByLabelText('Rush checkbox'));
    expect(screen.getByText('2125.00', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    expect(await screen.findByRole('status')).toHaveTextContent('settings saved');
    expect(saveBidSettings.mock.calls[0][0][calculationTypes[0]]).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'bidAmount', multiplier: '2' }), expect.objectContaining({ field: 'rush', multiplier: '100' })]));
    expect(saveBidSettings.mock.calls[0][0][calculationTypes[2]]).toEqual(defaultCalculationRules[calculationTypes[2]]);
});
test('retains unsaved changes after a failed save', async () => {
    saveBidSettings.mockRejectedValueOnce(new Error('Unable to save settings.'));
    render(<Settings />);
    await screen.findByLabelText('Bid type');
    fireEvent.change(screen.getByLabelText('Appraisal fee multiplier'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save settings.');
    expect(screen.getByLabelText('Appraisal fee multiplier')).toHaveValue(2);
});
test('switches types and restores defaults only for the chosen type', async () => {
    render(<Settings />); await screen.findByLabelText('Bid type');
    fireEvent.change(screen.getByLabelText('Appraisal fee multiplier'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Bid type'), { target: { value: calculationTypes[1] } });
    fireEvent.change(screen.getByLabelText('Appraisal fee multiplier'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Restore defaults/ }));
    expect(screen.getByLabelText('Appraisal fee multiplier')).toHaveValue(1);
    fireEvent.change(screen.getByLabelText('Bid type'), { target: { value: calculationTypes[0] } });
    expect(screen.getByLabelText('Appraisal fee multiplier')).toHaveValue(2);
});
test('loads with retry and blocks invalid multipliers', async () => {
    getBidSettings.mockRejectedValueOnce(new Error('Server unavailable.'));
    render(<Settings />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByLabelText('Bid type');
    fireEvent.change(screen.getByLabelText('Appraisal fee multiplier'), { target: { value: '-1' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Bid calculation settings' }));
    expect(saveBidSettings).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Appraisal fee multiplier')).toBeInvalid();
});


test('keeps navigation tabs and contains logout in the account dropdown', async () => {
    render(<Settings />);
    await screen.findByLabelText('Bid type');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    for (const label of ['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging', 'Settings']) {
        expect(within(nav).getByRole('link', { name: label })).toBeVisible();
    }
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('button', { name: 'Logout' }).closest('.hamburger_dropdown')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveAttribute('aria-expanded', 'true');
});
