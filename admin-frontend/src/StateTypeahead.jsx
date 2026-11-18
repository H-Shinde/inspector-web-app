import { useState } from 'react';
import { states } from './StateSelect';

export default function StateTypeahead({ id, name, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const query = value.trim().toLowerCase();
    const matches = query ? states.filter(([code, label]) => code.toLowerCase().startsWith(query) || label.toLowerCase().includes(query)).slice(0, 6) : [];
    const expanded = open && Boolean(query);
    const select = (code) => {
        onChange(code);
        setOpen(false);
        setActive(-1);
    };

    return <div className="client_typeahead">
        <input id={id} name={name} type="text" role="combobox" autoComplete="off"
            aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? `${id}-states` : undefined}
            aria-activedescendant={expanded && matches[active] ? `${id}-state-${matches[active][0]}` : undefined}
            placeholder="Type a state name or code" value={value}
            onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }}
            onChange={(event) => {
                const text = event.target.value;
                const exact = states.find(([code, label]) => [code.toLowerCase(), label.toLowerCase()].includes(text.trim().toLowerCase()));
                onChange(exact ? exact[0] : text);
                setOpen(true);
                setActive(-1);
            }}
            onKeyDown={(event) => {
                if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
                    event.preventDefault();
                    setOpen(true);
                    setActive((index) => event.key === 'ArrowDown' ? (index + 1) % matches.length : (index <= 0 ? matches.length - 1 : index - 1));
                } else if (event.key === 'Escape' && expanded) {
                    event.preventDefault();
                    setOpen(false);
                    setActive(-1);
                } else if (event.key === 'Enter' && expanded) {
                    event.preventDefault();
                    const choice = matches[active] ?? (matches.length === 1 ? matches[0] : undefined);
                    if (choice) select(choice[0]);
                }
            }} />
        {expanded && <div className="client_typeahead_results">
            <ul id={`${id}-states`} role="listbox" aria-label="Matching states">
                {matches.map(([code, label], index) => <li key={code} id={`${id}-state-${code}`}
                    role="option" aria-selected={active === index}
                    onMouseDown={(event) => event.preventDefault()} onClick={() => select(code)}>
                    {label} ({code})
                </li>)}
            </ul>
            {!matches.length && <p role="status">No matching states.</p>}
        </div>}
    </div>;
}
