import { useState } from 'react';
import { validateInput } from './fieldValidation';
import './ValidatedForm.css';

export default function ValidatedForm({ children, onSubmit, onChange, onInput, onBlur, ...props }) {
    const [errors, setErrors] = useState({});
    const keyFor = (input) => input.id || input.name;
    const validateForm = (form) => {
        const next = {};
        for (const input of Array.from(form.elements)) {
            if (!input.setCustomValidity) continue;
            const message = validateInput(input);
            if (message) next[keyFor(input)] = `${input.labels?.[0]?.textContent || input.name || 'Field'}: ${message}`;
        }
        setErrors(next);
        return next;
    };
    const submit = (event) => {
        const next = validateForm(event.currentTarget);
        if (Object.keys(next).length) {
            event.preventDefault();
            return;
        }
        onSubmit?.(event);
    };
    return <form {...props} noValidate onSubmit={submit}
        onChange={(event) => { validateForm(event.currentTarget); onChange?.(event); }}
        onInput={(event) => { validateForm(event.currentTarget); onInput?.(event); }}
        onBlur={(event) => {
            const input = event.target;
            if (input.setCustomValidity) {
                const message = validateInput(input);
                setErrors((previous) => { const next = { ...previous }; if (message) next[keyFor(input)] = `${input.labels?.[0]?.textContent || 'Field'}: ${message}`; else delete next[keyFor(input)]; return next; });
            }
            onBlur?.(event);
        }}>
        {Object.keys(errors).length > 0 && <div className="add_bid_error" role="alert" aria-live="polite">{Object.entries(errors).map(([key, message]) => <p key={key}>{message}</p>)}</div>}
        {children}
    </form>;
}
