import { useId, useState } from 'react';

export default function ClientTypeahead({ clients, loading, disabled, onSelect }) {
    const id = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const name = (client) => client.name ?? client.contactName ?? '';
    const matches = query.trim() ? clients.filter((client) => name(client).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20) : [];
    const expanded = open && query.trim().length > 0;
    const select = (client) => { setQuery(name(client)); setOpen(false); setActive(-1); onSelect(client); };
    return <div className="client_typeahead">
        <label htmlFor={id}>Search client by name</label>
        <input id={id} type="text" role="combobox" autoComplete="off" aria-autocomplete="list"
            aria-expanded={expanded} aria-controls={`${id}-results`}
            aria-activedescendant={expanded && matches[active] ? `${id}-option-${active}` : undefined}
            disabled={loading || disabled} placeholder={loading ? 'Loading clients…' : 'Start typing a client name'}
            value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }}
            onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault(); setOpen(true);
                    setActive((previous) => matches.length ? event.key === 'ArrowDown' ? (previous + 1) % matches.length : (previous <= 0 ? matches.length - 1 : previous - 1) : -1);
                } else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1); }
                else if (event.key === 'Enter' && expanded) {
                    event.preventDefault(); if (matches[active]) select(matches[active]);
                }
            }} />
        {expanded && <div className="client_typeahead_results">
            <ul id={`${id}-results`} role="listbox" aria-label="Matching clients">
                {matches.map((client, index) => <li key={client.id} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
                    onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(client)}>
                    <strong>{name(client)}</strong><span>{[client.businessName ?? client.company ?? client.companyName, client.email].filter(Boolean).join(' · ')}</span>
                </li>)}
            </ul>
            {!matches.length && <p role="status">No matching clients. You can enter their details below.</p>}
        </div>}
    </div>;
}
