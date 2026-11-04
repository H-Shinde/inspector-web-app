const states = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI'.split(' '));

export function clientFieldError(field, value) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    if (field === 'phone' || field === 'fax') {
        if (!/^(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?:\s*(?:ext\.?|x|#)\s*\d{1,6})?$/i.test(text)) {
            return `Enter a 10-digit ${field === 'fax' ? 'fax' : 'phone'} number, such as (202) 555-0101. An optional +1 and extension are allowed.`;
        }
    }
    if (field === 'cityStateZip') {
        const match = text.match(/^([\p{L}][\p{L}\p{M} .’'\-]*),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/u);
        if (!match || !states.has(match[2].toUpperCase())) return 'Enter City, ST ZIP, such as Washington, DC 20001 or New York, NY 10001-1234.';
    }
    return '';
}

export function validateClientForm(form) {
    for (const field of ['phone', 'fax', 'cityStateZip']) {
        const input = form.querySelector(`[id$="-${field}"]`);
        if (input) input.setCustomValidity(clientFieldError(field, input.value));
    }
    return form.reportValidity();
}

export function clearClientFieldError(event) {
    event.target.setCustomValidity?.('');
}
