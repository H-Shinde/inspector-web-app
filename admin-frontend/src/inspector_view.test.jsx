import { fireEvent, render, screen, within } from '@testing-library/react';
import InspectorView from './inspector_view';
import { getInspectors } from './inspectorSelection';

beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/InspectorView?inspectorId=1');
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('shows twelve inspector detail fields and a back link', () => {
    render(<InspectorView />);
    expect(within(screen.getByRole('main')).getAllByRole('textbox')).toHaveLength(12);
    expect(screen.getByLabelText('Inspector').value).toBe('Alex Morgan');
    expect(screen.getByRole('link', { name: '← Back' }).getAttribute('href')).toBe('/Inspector');
});

test('adds all inspector details to the shared directory and shows demo confirmation', () => {
    render(<InspectorView />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Inspector' }));
    const popup = within(screen.getByRole('dialog'));
    fireEvent.change(popup.getByLabelText('Inspector'), { target: { value: 'Riley Stone' } });
    fireEvent.change(popup.getByLabelText('E-mail'), { target: { value: 'riley@example.com' } });
    fireEvent.change(popup.getByLabelText('Region'), { target: { value: 'Northeast' } });
    fireEvent.change(popup.getByLabelText('Number of Jobs'), { target: { value: '12' } });
    fireEvent.click(popup.getByRole('button', { name: 'Send Invite' }));
    expect(getInspectors().find((entry) => entry.name === 'Riley Stone')).toMatchObject({ email: 'riley@example.com', region: 'Northeast', numberOfJobs: 12, status: 'Invited' });
    expect(screen.getByRole('status').textContent).toContain('an invite has been sent to riley@example.com');
    expect(screen.getByLabelText('Inspector').value).toBe('Riley Stone');
});
