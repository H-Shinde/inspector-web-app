import { fireEvent, render, screen } from '@testing-library/react';
import Bidspage from './Bidspage';

beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    const bids = [{ id: 1, name: 'Avery Wilson', status: 'Pending', rush: false, subjectContactEmail: 'avery@example.com' }, { id: 2, name: 'Sam Bennett', status: 'Pending' }];
    sessionStorage.setItem('availableBids', JSON.stringify(bids));
    sessionStorage.setItem('selectedBid', JSON.stringify(bids[0]));
    window.history.replaceState(null, '', '/Bidspage?bidId=1');
});

test('loads the requested bid without a selection sidebar', () => {
    const { unmount } = render(<Bidspage />);
    expect(screen.queryByRole('complementary', { name: 'Bid selection' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Subject contact name')).toHaveValue('Avery Wilson');
    unmount();
    window.history.replaceState(null, '', '/Bidspage?bidId=2');
    render(<Bidspage />);
    expect(screen.getByLabelText('Subject contact name')).toHaveValue('Sam Bennett');
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
