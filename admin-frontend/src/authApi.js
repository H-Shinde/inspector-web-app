export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: { Accept: 'application/json', ...options.headers },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new AuthError('Unable to connect. Check your connection and try again.');
  }
  let result;
  try { result = await response.json(); } catch { result = null; }
  if (!response.ok) {
    const resetMissing = response.status === 404 && url.includes('/password-reset');
    const message = resetMissing ? 'Password reset is not available yet. Contact your administrator.'
      : typeof result?.error === 'string' ? result.error
        : response.status === 403 ? 'Your session could not be verified. Refresh the page and try again.'
          : response.status >= 500 ? 'The sign-in service is unavailable. Please try again shortly.'
            : 'Unable to complete the request. Please try again.';
    throw new AuthError(message, response.status);
  }
  if (!result || typeof result !== 'object') throw new AuthError('The sign-in service returned an unexpected response. Please try again.');
  return result;
}

const request = (path, options) => apiRequest(`/api/auth/${path}/`, options);

export async function getCurrentUser(signal) {
  try {
    const result = await request('me', { signal });
    if (result.id == null || typeof result.email !== 'string') throw new AuthError('The sign-in service returned an unexpected response.');
    return result;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export async function authPost(path, data = {}) {
  const { csrfToken } = await request('csrf');
  if (!csrfToken) throw new AuthError('Unable to verify the session. Refresh the page and try again.');
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
    body: JSON.stringify(data),
  });
}

export async function apiWrite(url, data, { method = 'POST', multipart = false } = {}) {
  const { csrfToken } = await request('csrf');
  if (!csrfToken) throw new AuthError('Unable to verify the session. Refresh the page and try again.');
  return apiRequest(url, {
    method,
    headers: { 'X-CSRFToken': csrfToken, ...(multipart ? {} : { 'Content-Type': 'application/json' }) },
    ...(method === 'DELETE' ? {} : { body: multipart ? data : JSON.stringify(data) }),
  });
}
