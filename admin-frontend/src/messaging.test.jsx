import { fireEvent, render, screen } from '@testing-library/react';
import Messaging from './messaging';

beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/Messaging');
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'message-1' } });
});

test('opens the inspector conversation requested in the URL', () => {
    window.history.replaceState(null, '', '/Messaging?inspectorId=2');
    render(<Messaging />);
    expect(screen.getByLabelText('Message Jordan Lee')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Jordan Lee/ }).getAttribute('aria-pressed')).toBe('true');
});

test('sends messages to the chosen inspector and restores conversation after reload', () => {
    const { unmount } = render(<Messaging />);
    expect(screen.getByRole('button', { name: 'Send Message' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Message Alex Morgan'), { target: { value: 'Please confirm availability.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(screen.getByText('Please confirm availability.')).toBeTruthy();
    expect(screen.getByText('Alex Morgan · Demo reply')).toBeTruthy();
    expect(screen.getByText(/Thanks for your message/)).toBeTruthy();
    expect(screen.getByLabelText('Message Alex Morgan').value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: /Jordan Lee/ }));
    expect(screen.queryByText('Please confirm availability.')).toBeNull();
    expect(screen.queryByText(/Thanks for your message/)).toBeNull();
    unmount();
    render(<Messaging />);
    expect(screen.getByText('Please confirm availability.')).toBeTruthy();
    expect(screen.getByText('Alex Morgan · Demo reply')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('inspectorMessages'))[0].inspectorId).toBe(1);
});
