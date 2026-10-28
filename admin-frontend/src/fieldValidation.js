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
    if (input.disabled || input.readOnly || ['hidden', 'submit', 'button', 'fieldset'].includes(input.type)) return '';
    const field = input.name || input.id?.split('-').pop() || '';
    input.setCustomValidity('');
    let message = '';
    if (['checkbox', 'radio'].includes(input.type)) {
        const checked = input.type === 'radio' && input.name
            ? Array.from(input.form?.elements || []).some((entry) => entry.name === input.name && entry.checked)
            : input.checked;
        if (input.required && !checked) message = 'This field is required.';
    } else if (input.type === 'file') {
        if (input.required && !input.files?.length) message = 'Choose a file.';
    } else {
        message = fieldError(field, input.value, { required: input.required, type: input.type });
        if (!message && input.value) {
            if (input.minLength > 0 && input.value.length < input.minLength) message = `Enter at least ${input.minLength} characters.`;
            else if (input.maxLength >= 0 && input.value.length > input.maxLength) message = `Enter no more than ${input.maxLength} characters.`;
            else if (input.type === 'number' && input.min !== '' && Number(input.value) < Number(input.min)) message = `Enter a number greater than or equal to ${input.min}.`;
            else if (input.type === 'number' && input.max !== '' && Number(input.value) > Number(input.max)) message = `Enter a number less than or equal to ${input.max}.`;
        }
    }
    input.setCustomValidity(message);
    const error = message;
    input.setAttribute('aria-invalid', String(Boolean(error)));
    return error;
}
