import { fireEvent, render, screen, within } from '@testing-library/react';
import InspectorView from './inspector_view';
import { getInspectors } from './inspectorSelection';

beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/InspectorView?inspectorId=1');
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('shows inspector details without a company field and a back link', () => {
    render(<InspectorView />);
    expect(within(screen.getByRole('main')).getAllByRole('textbox')).toHaveLength(11);
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Inspector').value).toBe('Alex Morgan');
    expect(screen.getByRole('link', { name: '← Back' }).getAttribute('href')).toBe('/Inspector');
});

test('switches profiles from the expanded sidebar and restores the profile on reload', () => {
    const { unmount } = render(<InspectorView />);
    const sidebar = within(screen.getByRole('complementary', { name: 'Inspector list' }));
    expect(sidebar.getAllByRole('button')).toHaveLength(15);
    fireEvent.click(sidebar.getByRole('button', { name: /Skyler Reed/ }));
    expect(screen.getByLabelText('Inspector')).toHaveValue('Skyler Reed');
    expect(screen.getByLabelText('E-mail')).toHaveValue('skyler.reed@example.com');
    expect(sidebar.getByRole('button', { name: /Skyler Reed/ })).toHaveAttribute('aria-pressed', 'true');
    expect(sessionStorage.getItem('selectedInspectorId')).toBeNull();
    unmount();
    render(<InspectorView />);
    expect(screen.getByLabelText('Inspector')).toHaveValue('Skyler Reed');
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
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Inspector').value).toBe('Riley Stone');
    expect(within(screen.getByRole('complementary')).getByRole('button', { name: 'Riley Stone' })).toHaveAttribute('aria-pressed', 'true');
});
