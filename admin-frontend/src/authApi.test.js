import { authPost, getCurrentUser } from './authApi';
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) });
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { delete global.fetch; });

test('posts credentials with a fresh CSRF token and includes session cookies', async () => {
  fetch.mockResolvedValueOnce(response(200, { csrfToken: 'token' })).mockResolvedValueOnce(response(200, { email: 'user@example.com' }));
  await authPost('login', { email: 'user@example.com', password: 'secret' });
  expect(fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf/', expect.objectContaining({ credentials: 'include' }));
  expect(fetch).toHaveBeenNthCalledWith(2, '/api/auth/login/', expect.objectContaining({ credentials: 'include', method: 'POST', headers: expect.objectContaining({ 'X-CSRFToken': 'token' }), body: JSON.stringify({ email: 'user@example.com', password: 'secret' }) }));
});

test('treats an anonymous session as signed out', async () => {
  fetch.mockResolvedValue(response(401, { error: 'Sign in required.' }));
  await expect(getCurrentUser()).resolves.toBeNull();
});

test('does not treat server failures as an authenticated session', async () => {
  fetch.mockResolvedValue({ ok: false, status: 500, json: jest.fn().mockRejectedValue(new Error('HTML response')) });
  await expect(getCurrentUser()).rejects.toThrow('service is unavailable');
});

test('preserves invalid-credential errors', async () => {
  fetch.mockResolvedValueOnce(response(200, { csrfToken: 'token' })).mockResolvedValueOnce(response(401, { error: 'Invalid email or password.' }));
  await expect(authPost('login', {})).rejects.toThrow('Invalid email or password.');
});

test('does not submit credentials without a CSRF token', async () => {
  fetch.mockResolvedValue(response(200, {}));
  await expect(authPost('login', {})).rejects.toThrow('Unable to verify');
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('explains missing reset endpoints without showing HTML', async () => {
  fetch.mockResolvedValueOnce(response(200, { csrfToken: 'token' })).mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn().mockRejectedValue(new Error('HTML response')) });
  await expect(authPost('password-reset', {})).rejects.toThrow('Password reset is not available yet');
});

test('handles network failures and malformed successful session responses', async () => {
  fetch.mockRejectedValueOnce(new Error('Network'));
  await expect(getCurrentUser()).rejects.toThrow('Unable to connect');
  fetch.mockResolvedValueOnce(response(200, {}));
  await expect(getCurrentUser()).rejects.toThrow('unexpected response');
});
