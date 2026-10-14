import { fireEvent, render, screen, within } from '@testing-library/react';
import Bidspage from './Bidspage';

beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    const bids = [{ id: 1, name: 'Avery Wilson', status: 'Pending', rush: false, subjectContactEmail: 'avery@example.com' }, { id: 2, name: 'Sam Bennett', status: 'Pending' }];
    sessionStorage.setItem('availableBids', JSON.stringify(bids));
    sessionStorage.setItem('selectedBid', JSON.stringify(bids[0]));
    window.history.replaceState(null, '', '/Bidspage?bidId=1');
});

test('selects bids from the sidebar and loads a requested bid on reopening', () => {
    const { unmount } = render(<Bidspage />);
    const sidebar = within(screen.getByRole('complementary', { name: 'Bid selection' }));
    fireEvent.click(sidebar.getByRole('button', { name: /Sam Bennett/ }));
    expect(screen.getByLabelText('Subject contact name')).toHaveValue('Sam Bennett');
    expect(window.location.search).toBe('?bidId=2');
    unmount();
    window.history.replaceState(null, '', '/Bidspage?bidId=1');
    render(<Bidspage />);
    expect(screen.getByLabelText('Subject contact name')).toHaveValue('Avery Wilson');
});

test('saves inline contact edits and restores them even from older session records', () => {
    const { unmount } = render(<Bidspage />);
    const original = sessionStorage.getItem('availableBids');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Subject contact name'), { target: { value: ' Avery Updated ' } });
    fireEvent.change(screen.getByLabelText('Subject contact e-mail'), { target: { value: 'updated@example.com' } });
    fireEvent.change(screen.getByLabelText('Rush'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(JSON.parse(localStorage.getItem('bidEdits'))['1']).toMatchObject({ name: 'Avery Updated', subjectContactEmail: 'updated@example.com', rush: true });
    expect(JSON.parse(sessionStorage.getItem('availableBids'))[1].name).toBe('Sam Bennett');
    unmount();
    sessionStorage.setItem('availableBids', original);
    render(<Bidspage />);
    expect(screen.getByLabelText('Subject contact name')).toHaveValue('Avery Updated');
    expect(screen.getByLabelText('Rush')).toHaveValue('Yes');
});

test('cancels changes without persisting them', () => {
    render(<Bidspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Subject contact name'), { target: { value: 'Unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Subject contact name')).toHaveValue('Avery Wilson');
    expect(localStorage.getItem('bidEdits')).toBeNull();
});
