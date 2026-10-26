import { useState } from 'react';
import { validateInput } from './fieldValidation';

export default function ValidatedForm({ children, onSubmit, onChange, onInput, onBlur, ...props }) {
    const [errors, setErrors] = useState({});
    const keyFor = (input) => input.id || input.name;
    const clear = (event) => {
        const input = event.target;
        if (!input.setCustomValidity) return;
        input.setCustomValidity('');
        input.removeAttribute('aria-invalid');
        setErrors((previous) => { const next = { ...previous }; delete next[keyFor(input)]; return next; });
    };
    const submit = (event) => {
        const form = event.currentTarget;
        const next = {};
        for (const input of Array.from(form.elements)) {
            if (!input.setCustomValidity) continue;
            const message = validateInput(input);
            if (message) next[keyFor(input)] = `${input.labels?.[0]?.textContent || input.name || 'Field'}: ${message}`;
        }
        setErrors(next);
        if (!form.checkValidity()) {
            event.preventDefault();
            form.reportValidity();
            return;
        }
        onSubmit?.(event);
    };
    return <form {...props} noValidate onSubmit={submit}
        onChange={(event) => { clear(event); onChange?.(event); }}
        onInput={(event) => { clear(event); onInput?.(event); }}
        onBlur={(event) => {
            const input = event.target;
            if (input.setCustomValidity) {
                const message = validateInput(input);
                setErrors((previous) => { const next = { ...previous }; if (message) next[keyFor(input)] = `${input.labels?.[0]?.textContent || 'Field'}: ${message}`; else delete next[keyFor(input)]; return next; });
            }
            onBlur?.(event);
        }}>
        {Object.keys(errors).length > 0 && <div className="add_bid_error" role="alert">{Object.entries(errors).map(([key, message]) => <p key={key}>{message}</p>)}</div>}
        {children}
    </form>;
}
