export const inspectorFields = [
    ['name', 'Inspector', 'text'], ['company', 'Company', 'text'],
    ['distance', 'Distance (miles)', 'number'], ['focus', 'Focus', 'select'],
    ['phone', 'Phone', 'tel'], ['email', 'E-mail', 'email'],
    ['address', 'Address', 'text'], ['cityStateZip', 'City, State, Zip', 'text'],
    ['region', 'Region', 'text'], ['notes', 'Notes', 'textarea'],
    ['numberOfJobs', 'Number of Jobs', 'number'], ['lastJobDate', 'Last Job (Date)', 'date'],
];
export const emptyInspector = Object.fromEntries(inspectorFields.map(([field]) => [field, field === 'focus' ? 'Inspection' : field === 'numberOfJobs' ? '0' : '']));

export function InspectorFormFields({ draft, onChange }) {
    return <div className="bid_form_body bid_form_grid">{inspectorFields.map(([field, label, type]) => {
        const props = { id: `new-inspector-${field}`, value: draft[field] ?? '', onChange: (event) => onChange(field, event.target.value), required: ['name', 'email'].includes(field) };
        return <div className="bid_form_field" key={field}><label htmlFor={props.id}>{label}</label>
            {type === 'select' ? <select {...props}><option>Inspection</option><option>Appraisal</option><option>Appraisal, Inspection</option></select>
                : type === 'textarea' ? <textarea {...props} rows={3} />
                : <input {...props} type={type} min={type === 'number' ? '0' : undefined} step={field === 'distance' ? 'any' : undefined} />}
        </div>;
    })}<p className="bid_form_hint bid_form_full">Demo invitation: no email will be delivered.</p></div>;
}
