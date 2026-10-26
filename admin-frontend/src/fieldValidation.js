import { clientFieldError } from './clientValidation';

export const stateCodes = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI'.split(' '));
const integers = new Set(['count', 'totalBids', 'numberOfJobs', 'completionDays', 'totalInspectedItems', 'totalNonInspectedItems', 'additionalLocations']);

export function fieldError(field, value, { required = false, type = 'text' } = {}) {
    const text = String(value ?? '').trim();
    if (!text) return required ? 'This field is required.' : '';
    if (/phone|fax/i.test(field) || type === 'tel') return clientFieldError(/fax/i.test(field) ? 'fax' : 'phone', text);
    if (field === 'cityStateZip') return clientFieldError(field, text);
    if (/zipCode$/i.test(field)) return /^\d{5}(?:-\d{4})?$/.test(text) ? '' : 'Enter a 5-digit ZIP code or ZIP+4, such as 10001-1234.';
    if (/^(clientState|state)$/.test(field)) return stateCodes.has(text.toUpperCase()) ? '' : 'Enter a valid two-letter state code, such as NY.';
    if (/^(clientCity|city)$/.test(field) && !/^[\p{L}][\p{L}\p{M} .’'\-]*$/u.test(text)) return 'Enter a city name, such as New York.';
    if (type === 'email' || /email$/i.test(field)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? '' : 'Enter a valid email address, such as name@example.com.';
    if (field === 'year') return /^\d{4}$/.test(text) && Number(text) >= 1000 ? '' : 'Enter a four-digit year.';
    if (type === 'number' || integers.has(field)) {
        if (!Number.isFinite(Number(text)) || Number(text) < 0) return 'Enter a number greater than or equal to zero.';
        if (integers.has(field) && !Number.isInteger(Number(text))) return 'Enter a whole number greater than or equal to zero.';
    }
    return '';
}

export function validateInput(input) {
    if (input.disabled || input.readOnly || ['hidden', 'checkbox', 'radio', 'file', 'submit', 'button', 'password'].includes(input.type)) return '';
    const field = input.name || input.id?.split('-').pop() || '';
    input.setCustomValidity('');
    const message = fieldError(field, input.value, { required: input.required, type: input.type });
    input.setCustomValidity(message);
    const error = message || (input.validity.valid ? '' : input.validationMessage);
    input.setAttribute('aria-invalid', String(Boolean(error)));
    return error;
}
