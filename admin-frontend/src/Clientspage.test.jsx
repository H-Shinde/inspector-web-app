import { fireEvent, render, screen, within } from '@testing-library/react';
import Clientspage from './Clientspage';

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/Clientspage?clientId=1');
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('selects clients by name and preserves selection when reopening the page', () => {
    const { unmount } = render(<Clientspage />);
    const sidebar = within(screen.getByRole('complementary', { name: 'Client selection' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Avery Wilson');
    fireEvent.click(sidebar.getByRole('button', { name: 'Sam Bennett' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Sam Bennett');
    expect(screen.getByLabelText('Email')).toHaveValue('sam@example.com');
    expect(sidebar.getByRole('button', { name: 'Sam Bennett' })).toHaveAttribute('aria-pressed', 'true');
    expect(sidebar.getByRole('button', { name: 'Avery Wilson' })).toHaveAttribute('aria-pressed', 'false');
    expect(window.location.search).toBe('?clientId=2');
    unmount();
    render(<Clientspage />);
    expect(screen.getByLabelText('Name')).toHaveValue('Sam Bennett');
});

test('adds a client to the sidebar and selects their information', () => {
    render(<Clientspage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Client' }));
    const popup = within(screen.getByRole('dialog'));
    fireEvent.change(popup.getByLabelText('Name'), { target: { value: 'Riley Stone' } });
    fireEvent.click(popup.getByRole('button', { name: 'Save Client' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Riley Stone');
    expect(screen.getByRole('button', { name: 'Riley Stone' })).toHaveAttribute('aria-pressed', 'true');
});

test('saves inline edits persistently without changing other clients', () => {
    const { unmount } = render(<Clientspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByLabelText('# ID')).not.toBeInTheDocument();
    expect(document.querySelector('input[type=hidden][name=id]')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' Avery Updated ' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'updated@example.com' } });
    fireEvent.change(screen.getByLabelText('Total Bids'), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Pending' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByRole('button', { name: 'Avery Updated' })).toHaveAttribute('aria-pressed', 'true');
    const saved = JSON.parse(localStorage.getItem('clients'));
    expect(saved.find((row) => row.id === 1)).toMatchObject({ name: 'Avery Updated', email: 'updated@example.com', totalBids: 22, status: 'Pending' });
    expect(saved.find((row) => row.id === 2).name).toBe('Sam Bennett');
    unmount();
    render(<Clientspage />);
    expect(screen.getByLabelText('Name')).toHaveValue('Avery Updated');
    expect(screen.getByLabelText('Email')).toHaveValue('updated@example.com');
});

test('cancels inline changes and keeps the selected client while editing', () => {
    render(<Clientspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Sam Bennett' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Avery Wilson');
    expect(screen.getByRole('button', { name: 'Sam Bennett' })).toBeEnabled();
    expect(localStorage.getItem('clients')).toBeNull();
});
