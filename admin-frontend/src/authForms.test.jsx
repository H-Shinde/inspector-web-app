import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForgotPassword from './Forgot_pass';
import UpdatePass from './Forgot_continue';
import LogoutButton from './LogoutButton';
import { authPost } from './authApi';
jest.mock('./authApi', () => ({ authPost: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); window.history.replaceState(null, '', '/'); authPost.mockResolvedValue({}); });

test('requests a reset link and confirms the request only after the server succeeds', async () => {
  render(<ForgotPassword />);
  fireEvent.change(screen.getByLabelText('Registered email address'), { target: { value: 'user@example.com' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(authPost).toHaveBeenCalledWith('password-reset', { email: 'user@example.com' });
  expect(await screen.findByRole('status')).toHaveTextContent('Follow the link');
});

test('reset failures do not pretend an email was sent', async () => {
  authPost.mockRejectedValue(new Error('Password reset is not available yet.'));
  render(<ForgotPassword />);
  fireEvent.change(screen.getByLabelText('Registered email address'), { target: { value: 'user@example.com' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('not available');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('requires an emailed token before showing the new password form', () => {
  render(<UpdatePass />);
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  expect(screen.getByText('Request a new link')).toHaveAttribute('href', '/ForgotPassword');
});

test('checks password confirmation then sends the token and passwords to Django', async () => {
  window.history.replaceState(null, '', '/UpdatePass?uid=MQ&token=reset-token');
  render(<UpdatePass />);
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'a-strong-password' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
  expect(authPost).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a-strong-password' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(await screen.findByText('Password updated')).toBeInTheDocument();
  expect(authPost).toHaveBeenCalledWith('password-reset-confirm', { uid: 'MQ', token: 'reset-token', new_password1: 'a-strong-password', new_password2: 'a-strong-password' });
  expect(window.location.search).toBe('');
});

test('logout ends the backend session before navigation', async () => {
  const location = window.location;
  delete window.location; window.location = { assign: jest.fn() };
  try {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/'));
    expect(authPost).toHaveBeenCalledWith('logout');
  } finally { window.location = location; }
});

test('failed logout stays on the page and can be retried', async () => {
  authPost.mockRejectedValue(new Error('Unable to connect.'));
  render(<LogoutButton />);
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect');
  expect(screen.getByRole('button', { name: 'Logout' })).toBeEnabled();
});
