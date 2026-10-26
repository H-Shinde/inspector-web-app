import { clientFieldError } from './clientValidation';

test.each(['2025550101', '(202) 555-0101', '+1 202-555-0101 ext. 42', '1-202-555-0101', ''])('accepts phone and fax format %s', (value) => {
    expect(clientFieldError('phone', value)).toBe('');
    expect(clientFieldError('fax', value)).toBe('');
});
test.each(['abc', '123', '202-555-01012', '202-555-0101oops'])('rejects invalid phone and fax %s', (value) => {
    expect(clientFieldError('phone', value)).not.toBe('');
    expect(clientFieldError('fax', value)).not.toBe('');
});
test.each(['Washington, DC 20001', 'New York, NY 10001-1234', 'St. Louis, mo 63101', ''])('accepts city/state/ZIP %s', (value) => {
    expect(clientFieldError('cityStateZip', value)).toBe('');
});
test.each(['Washington', 'Washington, ZZ 20001', 'New York, NY 1234', 'Boston, MA 02108oops'])('rejects invalid city/state/ZIP %s', (value) => {
    expect(clientFieldError('cityStateZip', value)).not.toBe('');
});
