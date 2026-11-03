import { fireEvent, render, screen, within } from '@testing-library/react';
import Settings from './Settings';
import { getBidSettings, saveBidSettings } from './bidSettingsApi';
import { defaultCalculationRules, calculationTypes } from './bidCalculation';
jest.mock('./bidSettingsApi', () => ({ getBidSettings: jest.fn(), saveBidSettings: jest.fn() }));
const response = () => ({
    rules: JSON.parse(JSON.stringify(defaultCalculationRules)), defaults: JSON.parse(JSON.stringify(defaultCalculationRules)), types: calculationTypes,
    fields: [{ field: 'fmvContinuedUse', label: 'FMV in continued use', checkbox: true, percentage: true }, { field: 'bidAmount', label: 'Appraisal fee' }, { field: 'discount', label: 'PDF discount' }, { field: 'rushDiscount', label: 'Rush discount' }, { field: 'rush', label: 'Rush checkbox', checkbox: true }, { field: 'pdfOnly', label: 'PDF Only checkbox', checkbox: true }, { field: 'additionalLocations', label: 'Additional locations' }],
});
beforeEach(() => { jest.clearAllMocks(); getBidSettings.mockResolvedValue(response()); saveBidSettings.mockImplementation(async (rules) => ({ ...response(), rules })); });
test('changes a formula and saves all bid types', async () => {
    render(<Settings />);
    await screen.findByLabelText('Bid type');
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    fireEvent.change(screen.getByLabelText('Appraisal fee multiplier'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    expect(await screen.findByRole('status')).toHaveTextContent('settings saved');
    expect(saveBidSettings.mock.calls[0][0][calculationTypes[0]]).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'bidAmount', multiplier: '2' })]));
    expect(saveBidSettings.mock.calls[0][0][calculationTypes[2]]).toEqual(defaultCalculationRules[calculationTypes[2]]);
});
test('hides rush, PDF only and additional locations fields', async () => {
    render(<Settings />);
    await screen.findByLabelText('Bid type');
    for (const label of ['Rush checkbox', 'PDF Only checkbox', 'Additional locations']) {
        expect(screen.queryByText(label)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    }
});
test('shows rush surcharge and PDF discount without operation or condition controls', async () => {
    render(<Settings />);
    await screen.findByLabelText('Bid type');
    expect(screen.queryByText('Rush discount')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rush surcharge' })).toBeInTheDocument();
    for (const label of ['Rush surcharge', 'PDF discount']) {
        expect(screen.getByLabelText(`${label} multiplier`)).toBeEnabled();
        expect(screen.queryByLabelText(`${label} operation`)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(`${label} condition`)).not.toBeInTheDocument();
    }
});
test('always saves rush surcharge as add and PDF discount as subtract', async () => {
    render(<Settings />);
    await screen.findByLabelText('Bid type');
    fireEvent.change(screen.getByLabelText('Rush surcharge multiplier'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('PDF discount multiplier'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await screen.findByText('Bid calculation settings saved.');
    expect(saveBidSettings.mock.calls[0][0][calculationTypes[0]]).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'rushDiscount', operation: 'add', multiplier: '3' }),
        expect.objectContaining({ field: 'discount', operation: 'subtract', multiplier: '4' }),
    ]));
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
    for (const label of ['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging']) {
        expect(within(nav).getByRole('link', { name: label })).toBeVisible();
    }
    expect(within(nav).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('button', { name: 'Logout' }).closest('.hamburger_dropdown')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Settings' }).closest('.hamburger_dropdown')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveAttribute('aria-expanded', 'true');
});

test('edits asset checkbox percentages and previews the surcharge', async () => {
    render(<Settings />); await screen.findByLabelText('Bid type');
    fireEvent.change(screen.getByLabelText('FMV in continued use percentage'), { target: { value: '10' } });
    const preview = within(screen.getByRole('region', { name: 'Calculation preview' }));
    fireEvent.click(preview.getByLabelText('FMV in continued use'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await screen.findByText('Bid calculation settings saved.');
    expect(saveBidSettings.mock.calls[0][0][calculationTypes[0]]).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'fmvContinuedUse', multiplier: '10', mode: 'percentage' })]));
});

test('PDF discount and rush surcharge are preview checkboxes that apply their flat rate when checked', async () => {
    render(<Settings />); await screen.findByLabelText('Bid type');
    fireEvent.change(screen.getByLabelText('PDF discount multiplier'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Rush surcharge multiplier'), { target: { value: '40' } });
    const preview = within(screen.getByRole('region', { name: 'Calculation preview' }));
    const total = () => preview.getByText(/Preview total/).textContent;
    expect(total()).toContain('1065.00');
    fireEvent.click(preview.getByLabelText('PDF discount'));
    expect(total()).toContain('1140.00');
    fireEvent.click(preview.getByLabelText('Rush surcharge'));
    expect(total()).toContain('1100.00');
    expect(preview.getByLabelText('PDF discount')).toHaveAttribute('type', 'checkbox');
});

test('PDF discount and rush surcharge cards have an include checkbox that enables the flat rate', async () => {
    render(<Settings />); await screen.findByLabelText('Bid type');
    for (const label of ['PDF discount', 'Rush surcharge']) {
        expect(screen.getByLabelText(`Include ${label}`)).toBeChecked();
        expect(screen.getByLabelText(`${label} multiplier`)).toBeEnabled();
    }
    const preview = within(screen.getByRole('region', { name: 'Calculation preview' }));
    fireEvent.click(screen.getByLabelText('Include PDF discount'));
    expect(screen.getByLabelText('PDF discount multiplier')).toBeDisabled();
    expect(preview.queryByLabelText('PDF discount')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Include Rush surcharge'));
    fireEvent.click(screen.getByLabelText('Include Rush surcharge'));
    fireEvent.change(screen.getByLabelText('Rush surcharge multiplier'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await screen.findByText('Bid calculation settings saved.');
    const saved = saveBidSettings.mock.calls[0][0][calculationTypes[0]];
    expect(saved.some((term) => term.field === 'discount')).toBe(false);
    expect(saved).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'rushDiscount', operation: 'add', multiplier: '40' })]));
});