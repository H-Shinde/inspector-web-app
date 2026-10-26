import { fireEvent, render, screen } from '@testing-library/react';
import ValidatedForm from './ValidatedForm';
import { fieldError } from './fieldValidation';

test.each([
    ['subjectContactPhone', '123', 'tel'], ['clientPhone', 'bad', 'tel'],
    ['fax', 'bad', 'text'], ['clientEmail', 'missing-at', 'email'],
    ['state', 'ZZ', 'text'], ['clientZipCode', '1234', 'text'],
    ['cityStateZip', 'Boston, ZZ 12345', 'text'], ['city', '123', 'text'],
    ['completionDays', '1.5', 'number'], ['bidAmount', '-5', 'number'],
    ['year', '12', 'text'], ['numberOfJobs', '-1', 'number'],
])('rejects invalid %s', (field, value, type) => {
    expect(fieldError(field, value, { type })).not.toBe('');
});

test.each([
    ['subjectContactPhone', '+1 (202) 555-0101 ext. 42', 'tel'],
    ['clientEmail', 'client@example.com', 'email'], ['state', 'ny', 'text'],
    ['zipCode', '10001-1234', 'text'], ['city', "O’Fallon", 'text'],
    ['completionDays', '14', 'number'], ['bidAmount', '1250.50', 'number'],
    ['year', '2026', 'text'], ['fax', '', 'tel'],
])('accepts valid %s', (field, value, type) => {
    expect(fieldError(field, value, { type })).toBe('');
});

test('blocks invalid submissions, shows field errors, and permits correction', () => {
    const save = jest.fn((event) => event.preventDefault());
    render(<ValidatedForm aria-label="Test form" onSubmit={save}>
        <label htmlFor="test-name">Name</label><input id="test-name" required defaultValue="   " />
        <label htmlFor="test-phone">Phone</label><input id="test-phone" type="tel" defaultValue="123" />
        <label htmlFor="test-email">Email</label><input id="test-email" type="email" defaultValue="bad" />
        <button>Save</button>
    </ValidatedForm>);
    fireEvent.submit(screen.getByRole('form'));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Phone:');
    expect(screen.getByLabelText('Phone')).toBeInvalid();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '202-555-0101' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('does not validate read-only fields', () => {
    const save = jest.fn((event) => event.preventDefault());
    render(<ValidatedForm aria-label="Read-only form" onSubmit={save}>
        <input id="readonly-phone" readOnly defaultValue="Not provided" />
        <button>Save</button>
    </ValidatedForm>);
    fireEvent.submit(screen.getByRole('form'));
    expect(save).toHaveBeenCalled();
});
