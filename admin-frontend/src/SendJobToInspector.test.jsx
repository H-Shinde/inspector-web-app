import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SendJobToInspector from './SendJobToInspector';
import { generateInspectionRequest } from './inspectionRequest';
import { downloadAgreement } from './engagementAgreement';

jest.mock('./inspectionRequest', () => ({ ...jest.requireActual('./inspectionRequest'), generateInspectionRequest: jest.fn() }));
jest.mock('./engagementAgreement', () => ({ downloadAgreement: jest.fn() }));
const job = { id: 21, referenceNumber: 'BID-000021', name: 'Subject Contact', businessName: 'Example Co', inspector: 'Alex Morgan', inspectorId: 2, clientEmail: 'client@example.com' };
beforeEach(() => {
    sessionStorage.clear(); jest.clearAllMocks();
    generateInspectionRequest.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    URL.createObjectURL = jest.fn(() => 'blob:request'); URL.revokeObjectURL = jest.fn();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('requires an assigned inspector', () => {
    render(<SendJobToInspector job={{ ...job, inspector: '' }} />);
    expect(screen.queryByRole('button', { name: 'Send Job to Inspector' })).not.toBeInTheDocument();
});

test('previews the request, downloads it, and opens an edited draft to the assigned inspector', async () => {
    const location = window.location;
    delete window.location; window.location = { href: '' };
    try {
        render(<SendJobToInspector job={job} sections={{ 'Inspection Fees': { total: 350 } }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Send Job to Inspector' }));
        expect(screen.getByLabelText('To')).toHaveValue('alex.morgan@example.com');
        await screen.findByTitle('Inspection request PDF preview');
        expect(generateInspectionRequest).toHaveBeenCalledWith(job, expect.objectContaining({ name: 'Alex Morgan' }), { 'Inspection Fees': { total: 350 } });
        fireEvent.click(screen.getByRole('button', { name: 'Download Inspection Request' }));
        expect(downloadAgreement).toHaveBeenCalledWith(expect.any(Blob), 'BID-000021-inspection-request.pdf');
        fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please review the attached request.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email to Inspector' }));
        expect(window.location.href).toContain('mailto:alex.morgan%40example.com');
        expect(window.location.href).toContain('body=Please%20review');
        fireEvent.click(screen.getByRole('button', { name: 'Close inspector request' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:request');
    } finally { window.location = location; }
});

test('opens the request when openRequest changes and can hide its own button', async () => {
    const { rerender } = render(<SendJobToInspector job={job} hideButton openRequest={0} />);
    expect(screen.queryByRole('button', { name: 'Send Job to Inspector' })).not.toBeInTheDocument();
    expect(generateInspectionRequest).not.toHaveBeenCalled();
    rerender(<SendJobToInspector job={job} hideButton openRequest={1} />);
    await screen.findByTitle('Inspection request PDF preview');
    expect(generateInspectionRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Send Job to Inspector' })).not.toBeInTheDocument();
});

test('can retry generation without losing email edits', async () => {
    generateInspectionRequest.mockRejectedValueOnce(new Error('Template unavailable'));
    render(<SendJobToInspector job={job} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send Job to Inspector' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Open Email to Inspector' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'My draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry PDF' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download Inspection Request' })).toBeEnabled());
    expect(screen.getByLabelText('Message')).toHaveValue('My draft');
});