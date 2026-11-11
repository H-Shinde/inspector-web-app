import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UpdatesProvider, UpdateBadge, RecordUpdateBadge, useRecordSeen, useConversationSeen } from './updates';
import { apiRequest, apiWrite } from './authApi';
jest.mock('./authApi', () => ({ apiRequest: jest.fn(), apiWrite: jest.fn() }));
const empty = { counts: {}, total: 0, records: [], conversations: [], notifications: [], throughId: 0 };
const feed = { counts: { message: 2, job: 1 }, total: 3, throughId: 6,
    records: [{ kind: 'job', objectId: 7, version: 3, lastId: 5, isNew: false }],
    conversations: [{ conversationId: 4, count: 2, lastMessageId: 9, lastId: 6 }],
    notifications: [{ id: 6, kind: 'message', objectId: 9, conversationId: 4, title: 'New message from Inspector', target: '/Messaging?inspectorId=4', createdAt: '2026-11-11T12:00:00Z' }] };
let handlers;
beforeEach(() => {
    jest.clearAllMocks();
    apiRequest.mockResolvedValue(feed);
    apiWrite.mockImplementation(async () => { apiRequest.mockResolvedValue(empty); return empty; });
    global.EventSource = class { constructor() { handlers = {}; } addEventListener(event, callback) { handlers[event] = callback; } close() {} };
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
function Seen({ version, conversationId, messageId }) {
    useRecordSeen('job', 7, version);
    useConversationSeen(conversationId, messageId);
    return null;
}
test('badges are live throughout the app and separate React table roots', async () => {
    render(<UpdatesProvider><UpdateBadge kind="message" /></UpdatesProvider>);
    await screen.findByLabelText('2 unread messages');
    const detached = render(<RecordUpdateBadge kind="job" id={7} />);
    expect(await screen.findByText('Updated')).toBeVisible();
    apiRequest.mockResolvedValue(empty);
    await act(async () => { handlers['updates-changed'](); });
    await waitFor(() => expect(screen.queryByLabelText('2 unread messages')).not.toBeInTheDocument());
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
    detached.unmount();
});
test('opening a stale job does not acknowledge newer revisions', async () => {
    const view = render(<UpdatesProvider><Seen version={2} /></UpdatesProvider>);
    await screen.findByRole('button', { name: /Updates/ });
    expect(apiWrite).not.toHaveBeenCalled();
    view.rerender(<UpdatesProvider><Seen version={3} /></UpdatesProvider>);
    await waitFor(() => expect(apiWrite).toHaveBeenCalledWith('/api/notifications/', { kind: 'job', objectId: 7, throughId: 5 }));
});
test('messages clear only after that conversation is actually loaded', async () => {
    const view = render(<UpdatesProvider><Seen version={-1} conversationId={4} messageId={8} /></UpdatesProvider>);
    await screen.findByRole('button', { name: /Updates/ });
    expect(apiWrite).not.toHaveBeenCalled();
    view.rerender(<UpdatesProvider><Seen version={-1} conversationId={4} messageId={9} /></UpdatesProvider>);
    await waitFor(() => expect(apiWrite).toHaveBeenCalledWith('/api/notifications/', { kind: 'message', conversationId: 4, throughId: 6 }));
});
test('updates panel links to the record and marks only the displayed snapshot read', async () => {
    render(<UpdatesProvider><span>App</span></UpdatesProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Updates/ }));
    expect(screen.getByRole('link', { name: 'New message from Inspector' })).toHaveAttribute('href', '/Messaging?inspectorId=4');
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(apiWrite).toHaveBeenCalledWith('/api/notifications/', { all: true, throughId: 6 }));
    await screen.findByText(/all caught up/);
});
test('background tabs do not mark messages as read', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    render(<UpdatesProvider><Seen version={-1} conversationId={4} messageId={9} /></UpdatesProvider>);
    await screen.findByRole('button', { name: /Updates/ });
    expect(apiWrite).not.toHaveBeenCalled();
});
