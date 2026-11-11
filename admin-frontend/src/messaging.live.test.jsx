import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Messaging from './messaging';
import { apiRequest, apiWrite } from './authApi';
jest.mock('./authApi', () => ({ apiRequest: jest.fn(), apiWrite: jest.fn() }));
jest.mock('./useInspectorDirectory', () => ({ __esModule: true, default: () => ({ inspectors: [{ id: 7, name: 'Alex Inspector', email: 'alex@example.com' }] }) }));
jest.mock('./inspectorSelection', () => ({ useSelectedInspector: () => null }));
let events;
beforeEach(() => {
    jest.clearAllMocks();
    global.EventSource = class { constructor() { events = this; this.handlers = {}; } addEventListener(name, callback) { this.handlers[name] = callback; } close() {} };
    Element.prototype.scrollIntoView = jest.fn();
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => '00000000-0000-4000-8000-000000000001' } });
    apiRequest.mockResolvedValue({ messages: [], hasEarlier: false });
});
test('sends real messages and receives live replies without demo responses', async () => {
    apiWrite.mockResolvedValue({ id: 1, from: 'admin', text: 'Hello Alex', createdAt: '2026-11-11T12:00:00Z', attachments: [] });
    render(<Messaging />);
    const draft = await screen.findByLabelText('Message Alex Inspector');
    fireEvent.change(draft, { target: { value: 'Hello Alex' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    await screen.findByText('Hello Alex');
    expect(apiWrite).toHaveBeenCalledWith('/api/messages/', expect.any(FormData), { multipart: true });
    expect(apiWrite.mock.calls[0][1].get('inspectorId')).toBe('7');
    expect(screen.queryByText(/Demo reply/)).not.toBeInTheDocument();
    apiRequest.mockResolvedValue({ messages: [{ id: 2, from: 'inspector', text: 'Real reply', createdAt: '2026-11-11T12:01:00Z', attachments: [] }], hasEarlier: false });
    await act(async () => { events.handlers['messages-changed'](); });
    await screen.findByText('Real reply');
});
