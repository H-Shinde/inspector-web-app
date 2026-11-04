import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { authPost, getCurrentUser } from './authApi';

jest.mock('./authApi', () => ({ authPost: jest.fn(), getCurrentUser: jest.fn() }));
jest.mock('./BidsJobsHomepage', () => () => <p>Private bids page</p>);
jest.mock('datatables.net-react', () => { const Table = () => null; Table.use = () => {}; return Table; });
jest.mock('datatables.net-dt', () => ({ render: { text: () => undefined } }));
jest.mock('datatables.net-select-dt', () => ({}));
jest.mock('datatables.net-responsive-dt', () => ({}));

const originalLocation = window.location;
beforeEach(() => {
  jest.clearAllMocks();
  delete window.location;
  window.location = { pathname: '/', search: '', hash: '', origin: 'http://localhost', assign: jest.fn() };
  getCurrentUser.mockResolvedValue(null); authPost.mockResolvedValue({ email: 'user@example.com' });
});
afterEach(() => { window.location = originalLocation; });

test('waits for session verification before rendering private content', async () => {
  let resolve;
  getCurrentUser.mockReturnValue(new Promise((done) => { resolve = done; }));
  window.location.pathname = '/Homepage';
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(screen.queryByText('Private bids page')).not.toBeInTheDocument();
  resolve({ id: 1, email: 'user@example.com' });
  expect(await screen.findByText('Private bids page')).toBeInTheDocument();
});

test('signed-out users see login and return to their requested private URL after login', async () => {
  window.location.pathname = '/Bidspage'; window.location.search = '?bidId=12';
  render(<App />);
  await screen.findByRole('form', { name: 'Sign in' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
  await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/Bidspage?bidId=12'));
  expect(authPost).toHaveBeenCalledWith('login', { email: 'user@example.com', password: 'secret' });
});

test('failed login stays on the form and displays the error', async () => {
  authPost.mockRejectedValue(new Error('Invalid email or password.'));
  render(<App />);
  await screen.findByRole('form', { name: 'Sign in' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  expect(window.location.assign).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
});

test('session errors keep private pages hidden and offer retry', async () => {
  window.location.pathname = '/Homepage';
  getCurrentUser.mockRejectedValueOnce(new Error('Server unavailable')).mockResolvedValueOnce({ id: 1, email: 'user@example.com' });
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
  expect(screen.queryByText('Private bids page')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Private bids page')).toBeInTheDocument();
});

test('never redirects a login to an external next URL', async () => {
  window.location.search = '?next=https://example.com';
  render(<App />);
  await screen.findByRole('form', { name: 'Sign in' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
  await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/Homepage'));
});
