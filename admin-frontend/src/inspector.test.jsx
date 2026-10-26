import { fireEvent, render, screen, within } from '@testing-library/react';
import Inspector from './inspector';

jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data, slots }, ref) => {
        React.useImperativeHandle(ref, () => ({ dt: () => ({ row: (element) => ({ data: () => data.find((row) => String(row.id) === element.dataset.id) }) }) }));
        return <table><tbody>{data.map((row) => <tr key={row.id} data-id={row.id} tabIndex={0}><td>{row.name}</td><td>{slots[4](null, null, row)}</td></tr>)}</tbody></table>;
    });
    Table.use = () => {};
    return Table;
});
jest.mock('datatables.net-dt', () => ({ render: { text: () => undefined } }));

beforeEach(() => {
    sessionStorage.clear();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
});

const invite = async (email) => {
    fireEvent.click(screen.getByRole('button', { name: '+ Invite Inspector' }));
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
    await screen.findByText(/Invite link copied/);
    return screen.getByLabelText('Invite link').value;
};

test('invite asks only for an email and copies a sign-up link', async () => {
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: '+ Invite Inspector' }));
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'riley@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
    await screen.findByText(/Invite link copied/);
    const link = screen.getByLabelText('Invite link').value;
    expect(link).toMatch(/\/InspectorSignup\?invite=.+&email=riley%40example\.com$/);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link);
    expect(JSON.parse(sessionStorage.getItem('invitedInspectors'))[0]).toMatchObject({ email: 'riley@example.com', status: 'Invited' });
});

test('each email gets its own link and re-inviting reuses it', async () => {
    const { unmount } = render(<Inspector />);
    const first = await invite('a@example.com');
    unmount();
    render(<Inspector />);
    expect(screen.getByText('a@example.com')).toBeTruthy();
    expect(await invite('a@example.com')).toBe(first);
    expect(JSON.parse(sessionStorage.getItem('invitedInspectors'))).toHaveLength(1);
});

test('different emails produce different tokens', async () => {
    const { unmount } = render(<Inspector />);
    const a = await invite('a@example.com');
    unmount();
    render(<Inspector />);
    expect(await invite('b@example.com')).not.toBe(a);
});

test('the only row action is messaging', () => {
    render(<Inspector />);
    expect(screen.getByRole('button', { name: 'Message Alex Morgan' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Select Alex Morgan' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'View Alex Morgan' })).toBeNull();
});

test('clicking an inspector opens their details and Close dismisses the popup', () => {
    render(<Inspector />);
    fireEvent.click(screen.getByText('Alex Morgan'));
    const popup = screen.getByRole('dialog', { name: 'Inspector Details' });
    expect(within(popup).getByText('Alex Morgan')).toBeInTheDocument();
    expect(within(popup).getByText('Number of Jobs')).toBeInTheDocument();
    expect(within(popup).getByText('Notes')).toBeInTheDocument();
    fireEvent.click(within(popup).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('keyboard opens details and Escape or backdrop dismisses the popup', () => {
    render(<Inspector />);
    fireEvent.keyDown(screen.getByText('Alex Morgan').closest('tr'), { key: 'Enter' });
    fireEvent(screen.getByRole('dialog', { name: 'Inspector Details' }), new Event('cancel', { bubbles: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByText('Alex Morgan').closest('tr'), { key: ' ' });
    fireEvent.click(screen.getByRole('dialog', { name: 'Inspector Details' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
