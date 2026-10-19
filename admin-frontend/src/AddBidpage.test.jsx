import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AddBidpage from './AddBidpage';
import { generateEngagementAgreement, saveAgreement } from './engagementAgreement';

jest.mock('./engagementAgreement', () => ({
    ...jest.requireActual('./engagementAgreement'),
    generateEngagementAgreement: jest.fn(),
    saveAgreement: jest.fn(),
}));

beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    generateEngagementAgreement.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    saveAgreement.mockResolvedValue(undefined);
});

function submitBusinessValuation() {
    render(<AddBidpage />);
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Business Valuation (BV)' } });
    fireEvent.change(screen.getByLabelText('Business Name'), { target: { value: 'Example Company' } });
    fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'Avery Wilson' } });
    const client = within(screen.getByRole('group', { name: 'Client Information' }));
    for (const [label, value] of Object.entries({ 'Client Company': 'Client Co', 'Client Name': 'Jordan Smith',
        'Client Street Address': '50 Client Avenue', 'Client City': 'Albany', 'Client State': 'NY',
        'Client ZIP Code': '01234', 'Client Phone': '518-555-0100', 'Client Email': 'jordan@client.example' })) {
        fireEvent.change(client.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: '+ Add Bid' }));
}

test('waits for confirmation and lets the user cancel without saving a bid', () => {
    submitBusinessValuation();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(sessionStorage.getItem('createdBids')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(generateEngagementAgreement).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Business Name')).toHaveValue('Example Company');
});

test('creates one Pending bid and saves the generated agreement after confirmation', async () => {
    submitBusinessValuation();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await screen.findByRole('button', { name: 'Download Agreement PDF' });
    expect(generateEngagementAgreement).toHaveBeenCalledTimes(1);
    expect(saveAgreement).toHaveBeenCalledWith('BID-000021', expect.any(Blob));
    const saved = JSON.parse(sessionStorage.getItem('createdBids'));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ referenceNumber: 'BID-000021', status: 'Pending', engagementAgreement: 'BID-000021-engagement-agreement.pdf' });
    const client = { clientCompany: 'Client Co', clientName: 'Jordan Smith', clientStreetAddress: '50 Client Avenue',
        clientCity: 'Albany', clientState: 'NY', clientZipCode: '01234', clientPhone: '518-555-0100', clientEmail: 'jordan@client.example' };
    expect(saved[0]).toMatchObject(client);
    expect(generateEngagementAgreement).toHaveBeenCalledWith(expect.objectContaining(client));
});

test('keeps the form and avoids saving a bid when PDF generation fails', async () => {
    generateEngagementAgreement.mockRejectedValueOnce(new Error('Template unavailable'));
    submitBusinessValuation();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to create'));
    expect(sessionStorage.getItem('createdBids')).toBeNull();
    expect(saveAgreement).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirm & Create' })).toBeEnabled();
});

test('limits machinery report formats and clears the previous format when changing appraisal type', () => {
    render(<AddBidpage />);
    fireEvent.change(screen.getByLabelText('Report Format'), { target: { value: 'Narrative' } });
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Machinery & Equipment (M&E)' } });
    const report = screen.getByRole('combobox', { name: 'Report Format' });
    expect(report).toHaveValue('');
    expect(within(report).getAllByRole('option').map((option) => option.value)).toEqual(['', 'Onsite', 'Desktop']);
    fireEvent.change(report, { target: { value: 'Desktop' } });
    expect(report).toHaveValue('Desktop');
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Business Valuation (BV)' } });
    expect(screen.getByRole('textbox', { name: 'Report Format' })).toHaveValue('');
});

test('shows only the requested M&E fields and restores hidden BV draft values', () => {
    render(<AddBidpage />);
    fireEvent.change(screen.getByLabelText('Intended Use'), { target: { value: 'Financing' } });
    fireEvent.change(screen.getByLabelText('Client Email'), { target: { value: 'unfinished-email' } });
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Machinery & Equipment (M&E)' } });
    const form = screen.getByRole('form', { name: 'Add bid' });
    expect([...form.querySelectorAll('input, select')].map((input) => input.name).sort()).toEqual([
        'appraisalType', 'reportFormat', 'referenceNumber', 'status', 'businessName', 'propertyType',
        'businessAddress', 'city', 'clientCompany', 'clientName', 'clientEmail', 'name', 'subjectContactEmail', 'subjectContactPhone',
        'valueType', 'valueDate', 'completionDays', 'date', 'bidAmount',
    ].sort());
    expect(screen.getByLabelText('Request Date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('M&E Bid')).toBeInTheDocument();
    expect(screen.getByLabelText('Business City')).toBeInTheDocument();
    expect(screen.queryByLabelText('Intended Use')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Business Valuation (BV)' } });
    expect(screen.getByLabelText('Intended Use')).toHaveValue('Financing');
    expect(screen.getByLabelText('Client Email')).toHaveValue('unfinished-email');
    expect(screen.queryByLabelText('Request Date')).not.toBeInTheDocument();
});

test('confirms M&E agreement creation and excludes hidden BV pricing fields', async () => {
        render(<AddBidpage />);
        fireEvent.change(screen.getByLabelText('Discount'), { target: { value: '100' } });
        fireEvent.change(screen.getByLabelText('Additional Charges'), { target: { value: '75' } });
        fireEvent.change(screen.getByLabelText('Client Email'), { target: { value: 'bv@example.com' } });
        fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Machinery & Equipment (M&E)' } });
        fireEvent.change(screen.getByLabelText('Business Name'), { target: { value: 'Machine Co' } });
        fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'Avery' } });
        fireEvent.change(screen.getByLabelText('M&E Bid'), { target: { value: '1000' } });
        fireEvent.change(screen.getByLabelText('Request Date'), { target: { value: '2026-10-18' } });
        fireEvent.click(screen.getByRole('button', { name: '+ Add Bid' }));
        expect(screen.getByRole('dialog', { name: 'Confirm Machinery & Equipment bid?' })).toBeInTheDocument();
        expect(sessionStorage.getItem('createdBids')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
        await screen.findByRole('button', { name: 'Download Agreement PDF' });
        const [saved] = JSON.parse(sessionStorage.getItem('createdBids'));
        expect(saved).toMatchObject({ bidAmount: '1000', totalBid: '1000.00', date: '2026-10-18', status: 'Pending' });
        expect(saved).not.toHaveProperty('discount');
        expect(saved).not.toHaveProperty('additionalCharges');
        expect(saved.clientEmail).toBe('bv@example.com');
        expect(generateEngagementAgreement).toHaveBeenCalledWith(expect.objectContaining({ appraisalType: 'Machinery & Equipment (M&E)', bidAmount: '1000', date: '2026-10-18' }));
        expect(saved.engagementAgreement).toBe('BID-000021-engagement-agreement.pdf');
});

test('groups bid fields and calculates the total as pricing changes', () => {
    render(<AddBidpage />);
    for (const name of ['Appraisal', 'Business', 'Client Information', 'Subject Contact', 'Appraisal Details', 'Pricing']) {
        expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
    const pricing = within(screen.getByRole('group', { name: 'Pricing' }));
    fireEvent.change(pricing.getByLabelText('Appraisal Fee'), { target: { value: '1200.50' } });
    fireEvent.change(pricing.getByLabelText('Discount'), { target: { value: '100' } });
    fireEvent.change(pricing.getByLabelText('Additional Charges'), { target: { value: '25.25' } });
    expect(pricing.getByLabelText('Total Bid')).toHaveValue('1125.75');
    expect(pricing.getByLabelText('Total Bid')).toHaveAttribute('readonly');
    fireEvent.click(pricing.getByRole('checkbox', { name: 'PDF Only/ No hard copy' }));
    expect(pricing.getByRole('checkbox')).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Rush' }));
    expect(screen.getByRole('checkbox', { name: 'Rush' })).toBeChecked();
    const rushDiscount = pricing.getByLabelText('Rush Discount');
    expect(rushDiscount).toBeEnabled();
    fireEvent.change(rushDiscount, { target: { value: '50.25' } });
    expect(pricing.getByLabelText('Total Bid')).toHaveValue('1075.50');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Rush' }));
    expect(rushDiscount).toBeDisabled();
    expect(pricing.getByLabelText('Total Bid')).toHaveValue('1125.75');
});


describe('Back navigation', () => {
    const originalLocation = window.location;
    afterEach(() => { window.location = originalLocation; });

    test.each([
        ['?from=Homepage', '/Homepage'],
        ['?from=Bidspage', '/Bidspage'],
        ['', '/Homepage'],
    ])('returns to the entry page for %s despite a previously selected bid', (search, destination) => {
        sessionStorage.setItem('selectedBid', JSON.stringify({ id: 1 }));
        delete window.location;
        window.location = { search, href: '' };
        render(<AddBidpage />);
        fireEvent.click(screen.getByRole('button', { name: /Back/ }));
        expect(window.location.href).toBe(destination);
    });
});

test('previews the BV template and opens an editable email to the client after creation', async () => {
    submitBusinessValuation();
    expect(screen.getByLabelText('To')).toHaveValue('jordan@client.example');
    expect(screen.getByLabelText('Message').value).toContain('Jordan,');
    expect(screen.getByLabelText('Message').value).toContain('Example Company');
    expect(screen.getByLabelText('Message').value).toContain('Ref.: BID-000021');
    expect(screen.queryByRole('button', { name: 'Open Email to Client' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Your valuation proposal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await screen.findByRole('button', { name: 'Download Agreement PDF' });
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };
    try {
        fireEvent.click(screen.getByRole('button', { name: 'Open Email to Client' }));
        expect(window.location.href).toContain('mailto:jordan%40client.example?');
        expect(window.location.href).toContain('subject=Your%20valuation%20proposal');
        expect(decodeURIComponent(window.location.href)).toContain('Ref.: BID-000021');
        expect(generateEngagementAgreement).toHaveBeenCalledTimes(1);
    } finally { window.location = originalLocation; }
});


test('previews the filled PDF before creating a bid and uses the client first name in the greeting', async () => {
    const createURL = URL.createObjectURL;
    const revokeURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:agreement-preview');
    URL.revokeObjectURL = jest.fn();
    try {
        submitBusinessValuation();
        expect(screen.getByLabelText('Message').value.split('\n')[0]).toBe('Jordan,');
        fireEvent.click(screen.getByRole('button', { name: 'View PDF' }));
        expect(await screen.findByTitle('Engagement agreement PDF preview')).toHaveAttribute('src', 'blob:agreement-preview');
        expect(generateEngagementAgreement).toHaveBeenCalledWith(expect.objectContaining({ clientName: 'Jordan Smith', businessName: 'Example Company' }));
        expect(screen.getByRole('link', { name: 'Download Preview PDF' })).toHaveAttribute('href', 'blob:agreement-preview');
        expect(screen.getByRole('link', { name: 'Download Preview PDF' })).toHaveAttribute('download', 'BID-000021-engagement-agreement.pdf');
        expect(saveAgreement).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('createdBids')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        fireEvent.click(screen.getByRole('button', { name: '+ Add Bid' }));
        await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:agreement-preview'));
    } finally { URL.createObjectURL = createURL; URL.revokeObjectURL = revokeURL; }
});


test('fills the M&E email using client details and keeps the PDF and email actions', async () => {
    render(<AddBidpage />);
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Machinery & Equipment (M&E)' } });
    for (const [label, value] of Object.entries({ 'Business Name': 'Machine Co', 'Contact Name': 'Subject Person', 'Client Name': 'Jordan Smith', 'Client Email': 'jordan@example.com', 'M&E Bid': '1500', 'Completion Days': '7' })) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.change(screen.getByLabelText('Report Format'), { target: { value: 'Desktop' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add Bid' }));
    expect(screen.getByLabelText('To')).toHaveValue('jordan@example.com');
    const body = screen.getByLabelText('Message').value;
    expect(body).toMatch(/^Jordan,/);
    expect(body).toContain('Desktop Certified Machinery and Equipment Appraisal for $1500.00');
    expect(body).toContain('completed in 7 business days');
    expect(screen.getByRole('button', { name: 'View PDF' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await screen.findByRole('button', { name: 'Open Email to Client' });
    expect(screen.getByRole('button', { name: 'Download Agreement PDF' })).toBeInTheDocument();
});
