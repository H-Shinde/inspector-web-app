export const inspectorFields = [
    ['name', 'Inspector', 'text'], ['focus', 'Focus', 'select'],
    ['phone', 'Phone', 'tel'], ['email', 'E-mail', 'email'],
    ['address', 'Address', 'text'], ['city', 'City', 'text'],
    ['state', 'State', 'text'], ['zipCode', 'ZIP', 'text'],
    ['region', 'Region', 'text'], ['notes', 'Notes', 'textarea'],
];
export const emptyInspector = Object.fromEntries(inspectorFields.map(([field]) => [field, field === 'focus' ? 'Inspection' : '']));
export function InspectorFormFields({ draft, onChange, disabled = false }) {
    return <div className="bid_form_body bid_form_grid">{inspectorFields.map(([field, label, type]) => {
        const props = { id: `new-inspector-${field}`, name: field, disabled, value: draft[field] ?? '', onChange: (event) => onChange(field, field === 'state' ? event.target.value.toUpperCase() : event.target.value), required: ['name', 'email', 'zipCode'].includes(field) };
        return <div className="bid_form_field" key={field}><label htmlFor={props.id}>{label}</label>
            {type === 'select' ? <select {...props}><option>Inspection</option><option>Appraisal</option><option>Appraisal, Inspection</option></select>
                : type === 'textarea' ? <textarea {...props} rows={3} />
                : <input {...props} type={type} maxLength={field === 'state' ? 2 : field === 'zipCode' ? 10 : field === 'name' ? 200 : undefined} />}
        </div>;
    })}</div>;
}
