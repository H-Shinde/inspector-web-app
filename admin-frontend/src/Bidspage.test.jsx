import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Bidspage from './Bidspage';
import { readAgreement, downloadAgreement, generateEngagementAgreement } from './engagementAgreement';

jest.mock('./engagementAgreement', () => ({ ...jest.requireActual('./engagementAgreement'), readAgreement: jest.fn(), downloadAgreement: jest.fn(), generateEngagementAgreement: jest.fn() }));

beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    generateEngagementAgreement.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    URL.createObjectURL = jest.fn(() => 'blob:agreement');
    URL.revokeObjectURL = jest.fn();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    const bids = [{ id: 1, name: 'Avery Wilson', status: 'Pending', rush: false, subjectContactEmail: 'avery@example.com' }, { id: 2, name: 'Sam Bennett', status: 'Pending' }];
    sessionStorage.setItem('availableBids', JSON.stringify(bids));
    sessionStorage.setItem('selectedBid', JSON.stringify(bids[0]));
    window.history.replaceState(null, '', '/Bidspage?bidId=1');
});

test('loads the requested bid without a selection sidebar', () => {
    const { unmount } = render(<Bidspage />);
    expect(screen.queryByRole('complementary', { name: 'Bid selection' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
    expect(screen.getByLabelText('Contact Name')).toHaveValue('Avery Wilson');
    unmount();
    window.history.replaceState(null, '', '/Bidspage?bidId=2');
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
    expect(screen.getByLabelText('Contact Name')).toHaveValue('Sam Bennett');
});

test('saves inline contact edits and restores them even from older session records', () => {
    const { unmount } = render(<Bidspage />);
    const original = sessionStorage.getItem('availableBids');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
    fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: ' Avery Updated ' } });
    fireEvent.change(screen.getByLabelText('Contact Email'), { target: { value: 'updated@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal Details' }));
    fireEvent.click(screen.getByLabelText('Rush'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(JSON.parse(localStorage.getItem('bidEdits'))['1']).toMatchObject({ name: 'Avery Updated', subjectContactEmail: 'updated@example.com', rush: true });
    expect(JSON.parse(sessionStorage.getItem('availableBids'))[1].name).toBe('Sam Bennett');
    unmount();
    sessionStorage.setItem('availableBids', original);
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
    expect(screen.getByLabelText('Contact Name')).toHaveValue('Avery Updated');
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal Details' }));
    expect(screen.getByLabelText('Rush')).toHaveValue('Yes');
});

test('cancels changes without persisting them', () => {
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
    fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'Unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
    expect(screen.getByLabelText('Contact Name')).toHaveValue('Avery Wilson');
    expect(localStorage.getItem('bidEdits')).toBeNull();
});


test('requires an inspector and remembers the assignment when the bid is reopened', () => {
    const { unmount } = render(<Bidspage />);
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(sessionStorage.getItem('acceptedJobs')).toBeNull();
    fireEvent.change(screen.getByLabelText('Assigned inspector'), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled();
    expect(JSON.parse(sessionStorage.getItem('selectedBid'))).toMatchObject({ inspectorId: 1, inspector: 'Alex Morgan' });
    unmount();
    render(<Bidspage />);
    expect(screen.getByLabelText('Assigned inspector')).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Assigned inspector'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
});

test('carries the assigned inspector into the accepted job', () => {
    const location = window.location;
    delete window.location;
    window.location = { pathname: '/Homepage', search: '', href: '' };
    try {
        render(<Bidspage />);
        fireEvent.change(screen.getByLabelText('Assigned inspector'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
        expect(JSON.parse(sessionStorage.getItem('acceptedJobs'))[0]).toMatchObject({ sourceBidId: 1, inspectorId: 1, inspector: 'Alex Morgan' });
        expect(window.location.href).toMatch(/^\/Jobspage\?jobId=/);
    } finally { window.location = location; }
});


test('Documents downloads the PDF saved for the selected bid', async () => {
    const bid = JSON.parse(sessionStorage.getItem('selectedBid'));
    sessionStorage.setItem('selectedBid', JSON.stringify({ ...bid, referenceNumber: 'BID-000001', engagementAgreement: 'agreement.pdf' }));
    sessionStorage.setItem('availableBids', JSON.stringify([JSON.parse(sessionStorage.getItem('selectedBid'))]));
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    readAgreement.mockResolvedValueOnce(blob);
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Documents' }));
    expect(screen.getByText('agreement.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(downloadAgreement).toHaveBeenCalledWith(blob, 'agreement.pdf'));
    expect(readAgreement).toHaveBeenCalledWith('BID-000001');
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subject Contact' }));
    expect(screen.getByLabelText('Contact Name')).toHaveValue('Avery Wilson');
});

test('Documents shows an empty state for bids without a saved PDF', () => {
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Documents' }));
    expect(screen.getByText('No downloadable PDF is associated with this bid.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download PDF' })).not.toBeInTheDocument();
});


test('shows the shared Add Bid fields in sidebar sections and saves client and pricing edits', () => {
    render(<Bidspage />);
    expect(screen.getByLabelText('Report Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Reference Number')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Client Information' }));
    fireEvent.change(screen.getByLabelText('Client Company'), { target: { value: 'Example Client' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pricing' }));
    fireEvent.change(screen.getByLabelText('Appraisal Fee'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Discount'), { target: { value: '100' } });
    expect(screen.getByLabelText('Total Bid')).toHaveValue('900.00');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(JSON.parse(localStorage.getItem('bidEdits'))['1']).toMatchObject({ clientCompany: 'Example Client', bidAmount: '1000', totalBid: '900.00' });
});


test('M&E sections match Add Bid fields and exclude hidden pricing from the total', () => {
    const bid = { id: 1, name: 'Avery Wilson', businessName: 'Business', appraisalType: 'Machinery & Equipment (M&E)', bidAmount: '500', discount: '100', status: 'Pending' };
    sessionStorage.setItem('availableBids', JSON.stringify([bid]));
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Business' }));
    expect(screen.getByLabelText('Business City')).toBeInTheDocument();
    expect(screen.queryByLabelText('State')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal Details' }));
    expect(screen.getByLabelText('Request Date')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pricing' }));
    expect(screen.getByLabelText('M&E Bid')).toHaveValue('500');
    expect(screen.queryByLabelText('Discount')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(JSON.parse(sessionStorage.getItem('selectedBid')).totalBid).toBe('500.00');
});


test.each([
    ['Business Valuation (BV)', 'Business Valuation Bid – Example Co', '$900.00'],
    ['Machinery & Equipment (M&E)', 'Machinery & Equipment Bid – Example Co', '$1000.00'],
])('generates an editable %s email and opens the edited message in the email app', async (appraisalType, subject, fee) => {
    const bid = { id: 1, name: 'Avery', appraisalType, businessName: 'Example Co', clientName: 'Jordan Smith', clientEmail: 'jordan@example.com', bidAmount: '1000', discount: '100', completionDays: '10', referenceNumber: 'BID-000001', status: 'Pending' };
    sessionStorage.setItem('availableBids', JSON.stringify([bid]));
    const location = window.location;
    delete window.location;
    window.location = { pathname: '/Bidspage', search: '?bidId=1', href: '' };
    try {
        render(<Bidspage />);
        fireEvent.click(screen.getByRole('button', { name: 'Generate Email' }));
        expect(screen.getByRole('dialog', { name: 'Bid Email & Agreement' })).toBeInTheDocument();
        await screen.findByTitle('Engagement agreement PDF preview');
        expect(generateEngagementAgreement).toHaveBeenCalledWith(expect.objectContaining({ appraisalType, referenceNumber: 'BID-000001' }));
        fireEvent.click(screen.getByRole('button', { name: 'Download Agreement PDF' }));
        expect(downloadAgreement).toHaveBeenCalledWith(expect.any(Blob), 'BID-000001-engagement-agreement.pdf');
        expect(screen.getByLabelText('To')).toHaveValue('jordan@example.com');
        expect(screen.getByLabelText('Subject')).toHaveValue(subject);
        expect(screen.getByLabelText('Message').value).toContain(fee);
        expect(screen.getByLabelText('Message').value).toContain('Jordan,');
        fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Updated message' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email to Client' }));
        expect(window.location.href).toContain('mailto:jordan%40example.com?');
        expect(window.location.href).toContain('body=Updated%20message');
        fireEvent.click(screen.getByRole('button', { name: 'Close email' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally { window.location = location; }
});


test('keeps the email editable when PDF generation fails and can retry', async () => {
    sessionStorage.setItem('availableBids', JSON.stringify([{ id: 1, name: 'Avery', appraisalType: 'Business Valuation (BV)', status: 'Pending' }]));
    generateEngagementAgreement.mockRejectedValueOnce(new Error('Unavailable'));
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate Email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to generate the agreement');
    expect(screen.getByRole('button', { name: 'Download Agreement PDF' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry PDF' }));
    await screen.findByTitle('Engagement agreement PDF preview');
    expect(screen.getByLabelText('Message')).toHaveValue('Keep this draft');
    expect(screen.getByRole('button', { name: 'Download Agreement PDF' })).toBeEnabled();
});

test('switching appraisal type immediately changes fields and keeps automatic values stable', () => {
    const bid = { id: 1, name: 'Avery', businessName: 'Example Co', appraisalType: 'Business Valuation (BV)', reportFormat: 'Detailed', clientCompany: 'Client Co', clientStreetAddress: '10 Client St', bidAmount: '1000', discount: '100', status: 'Pending' };
    sessionStorage.setItem('availableBids', JSON.stringify([bid]));
    render(<Bidspage />);
    expect(screen.getByLabelText('Reference Number')).toHaveValue('BID-000001');
    expect(screen.getByLabelText('Reference Number')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Machinery & Equipment (M&E)' } });
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Report Format')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Report Format'), { target: { value: 'Desktop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Client Information' }));
    expect(screen.getByLabelText('Client Company')).toHaveValue('Client Co');
    expect(screen.queryByLabelText('Client Street Address')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pricing' }));
    expect(screen.getByLabelText('M&E Bid')).toHaveValue(1000);
    expect(screen.queryByLabelText('Discount')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal' }));
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Business Valuation (BV)' } });
    expect(screen.getByLabelText('Reference Number')).toHaveValue('BID-000001');
    fireEvent.click(screen.getByRole('button', { name: 'Client Information' }));
    expect(screen.getByLabelText('Client Street Address')).toHaveValue('10 Client St');
    fireEvent.click(screen.getByRole('button', { name: 'Pricing' }));
    expect(screen.getByLabelText('Total Bid')).toHaveValue('900.00');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal' }));
    expect(screen.getByLabelText('Appraisal Type')).toHaveValue('Business Valuation (BV)');
    expect(screen.getByLabelText('Report Format')).toHaveValue('Detailed');
});

test('preserves an existing reference and persists M&E request-date edits', () => {
    sessionStorage.setItem('availableBids', JSON.stringify([{ id: 1, name: 'Avery', businessName: 'Example Co', referenceNumber: 'CUSTOM-REF', appraisalType: 'Business Valuation (BV)' }]));
    const { unmount } = render(<Bidspage />);
    expect(screen.getByLabelText('Reference Number')).toHaveValue('CUSTOM-REF');
    expect(screen.getByLabelText('Status')).toHaveValue('Pending');
    fireEvent.change(screen.getByLabelText('Appraisal Type'), { target: { value: 'Machinery & Equipment (M&E)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal Details' }));
    fireEvent.change(screen.getByLabelText('Request Date'), { target: { value: '2026-10-21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(JSON.parse(localStorage.getItem('bidEdits'))['1']).toMatchObject({ referenceNumber: 'CUSTOM-REF', appraisalType: 'Machinery & Equipment (M&E)', date: '2026-10-21' });
    unmount();
    render(<Bidspage />);
    expect(screen.getByLabelText('Reference Number')).toHaveValue('CUSTOM-REF');
    fireEvent.click(screen.getByRole('button', { name: 'Appraisal Details' }));
    expect(screen.getByLabelText('Request Date')).toHaveValue('2026-10-21');
});


test('only allows discount edits when PDF Only is checked', () => {
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pricing' }));
    const discount = screen.getByLabelText('Discount');
    const pdf = screen.getByLabelText('PDF Only/ No hard copy');
    expect(discount).toBeDisabled();
    fireEvent.click(pdf);
    expect(discount).toBeEnabled();
    fireEvent.click(pdf);
    expect(discount).toBeDisabled();
});
