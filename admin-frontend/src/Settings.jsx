import { useEffect, useRef, useState } from 'react';
import useBidSettings from './useBidSettings';
import { saveBidSettings } from './bidSettingsApi';
import { appraisalTypeLabel } from './appraisalTypes';
import { assetPercentageFields } from './bidCalculation';
import ValidatedForm from './ValidatedForm';
import LogoutButton from './LogoutButton';
import navLogo from './bison_logo_nav.png';
import './Settings.css';
import { tierTables } from './tierRates';
const tableLabels = { inspection: 'Inspection Rate by Item Quantity (Appraised)', nonAppraisedInspection: 'Inspection Rate by Item Quantity (Non-Appraised)', appraisal: 'Appraisal Rate by Item Quantity' };

// Fields that no longer appear anywhere on the Settings page.
const hiddenFields = [
    'rush', 'pdfOnly', 'additionalLocations',
    'totalInspectedItems', 'totalNonInspectedItems', 'forcedLiquidationValue',
    'totalAppraisal', 'total', 'nonRushTotal', 'bidAmount',
];
const isHidden = ({ field, label }) => hiddenFields.includes(field) || /additional locations?/i.test(label || '');

// Apply standard fee operations automatically; conditions are not configurable in Settings.
const fixedRules = {
    consolidationFee: { operation: 'add', when: 'always' },
    ...Object.fromEntries(assetPercentageFields.map((field) => [field, { operation: 'add', when: 'always', mode: 'percentage' }])),
    discount: { operation: 'subtract', when: 'always' },
    rushDiscount: { operation: 'add', when: 'always' },
};
// These are checkboxes on the bid form: Settings stores a flat dollar amount that applies when the box is checked.
const checkboxFields = ['discount', 'rushDiscount', 'consolidationFee'];
const normalizeRules = (all) => Object.fromEntries(Object.entries(all).map(([name, terms]) => [name, terms.filter((term) => term.field !== 'completionDays').map((term) => ({ ...term, when: 'always', ...(fixedRules[term.field] || {}) }))]));
const labelOverrides = { rushDiscount: 'Rush surcharge' };
const displayLabel = (field, label) => labelOverrides[field] || label;

export default function Settings() {
    const { data, setData, loading, error, retry } = useBidSettings();
    const [rules, setRules] = useState(null);
    const [tables, setTables] = useState(tierTables);
    const [type, setType] = useState('Machinery & Equipment (M&E)');
    const [busy, setBusy] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [restoreType, setRestoreType] = useState(null);
    const restoreDialog = useRef(null);
    useEffect(() => {
        if (restoreType && restoreDialog.current && !restoreDialog.current.open) restoreDialog.current.showModal();
    }, [restoreType]);
    const closeRestore = () => { restoreDialog.current?.close(); setRestoreType(null); };
    const saving = useRef(false);
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    useEffect(() => { if (data) { setRules(normalizeRules(data.rules)); setTables(data.tierRates || tierTables); } }, [data]);
    const fields = (data?.fields || [])
        .filter((entry) => !isHidden(entry))
        .filter(({ field }) => type !== 'Machinery & Equipment (M&E)' || field !== 'additionalCharges')
        .map((entry) => ({ ...entry, label: displayLabel(entry.field, entry.label), checkbox: entry.checkbox || checkboxFields.includes(entry.field) }));
    const update = (field, changes) => {
        setNotice('');
        setRules((previous) => {
            const existing = previous[type].find((term) => term.field === field);
            const others = previous[type].filter((term) => term.field !== field);
            const fixed = fixedRules[field] || {};
            const defaultTerm = data.defaults[type]?.find((term) => term.field === field);
            return { ...previous, [type]: changes.operation === 'ignore' ? others : [...others, { field, operation: 'add', multiplier: assetPercentageFields.includes(field) ? '5.00' : '1.00', when: 'always', ...defaultTerm, ...existing, ...changes, when: 'always', ...fixed, ...(assetPercentageFields.includes(field) ? { mode: 'percentage' } : {}) }] };
        });
    };
    const save = async (event) => {
        event.preventDefault();
        if (saving.current) return;
        saving.current = true; setBusy(true); setSaveError(''); setNotice('');
        try { const result = await saveBidSettings(rules, tables); setData(result); setNotice('Bid calculation settings saved.'); }
        catch (error) { setSaveError(error.message); }
        finally { saving.current = false; setBusy(false); }
    };
    return <div className="frame_home bid_details_page settings_page">
        <dialog ref={restoreDialog} className="popup confirm_popup" aria-labelledby="restore-defaults-title" onCancel={(event) => { event.preventDefault(); closeRestore(); }}>
            <div className="confirm_body">
                <h2 id="restore-defaults-title">Restore default settings?</h2>
                <p>This will replace your current edits for {appraisalTypeLabel(restoreType)}. Click Save Settings afterward to save the restored defaults.</p>
            </div>
            <div className="actions">
                <button type="button" className="bid_form_cancel" onClick={closeRestore}>Cancel</button>
                <button type="button" className="bid_form_save" onClick={() => {
                    setRules((previous) => ({ ...previous, [restoreType]: normalizeRules({ [restoreType]: data.defaults[restoreType] })[restoreType] }));
                    setNotice(''); closeRestore();
                }}>Restore Defaults</button>
            </div>
        </dialog>
        <nav className="nav_bar" aria-label="Main navigation">
            <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
            <div className="nav_links">{['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => <div key={label}>
                <a className="nav_bar_text" href={label === 'Bids' ? '/Homepage' : `/${label}`}>{label}</a>
            </div>)}</div>
            <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
            </button>
            {menuOpen && <div className="hamburger_dropdown"><a className="dropdown_link dropdown_link_selected" href="/Settings" aria-current="page">Settings</a><LogoutButton /></div>}
        </nav>
        <main className="main_content">
            <header className="table_header"><div><h1>Settings</h1><p>Configure how fields contribute to your bid totals.</p></div></header>
            <p>These settings apply to your new bids. Existing bids keep their original calculation rules.</p>
            {loading && <p role="status">Loading settings…</p>}
            {error && <p role="alert">{error} <button type="button" onClick={retry}>Retry</button></p>}
            {!loading && !error && rules && <><ValidatedForm onSubmit={save} aria-label="Bid calculation settings">
                {saveError && <p role="alert" className="add_bid_error">{saveError}</p>}
                {notice && <p role="status">{notice}</p>}
                <fieldset disabled={busy} className="settings_fields">
                    <label htmlFor="settings-type">Bid type</label>
                    <select id="settings-type" value={type} onChange={(event) => setType(event.target.value)}>{data.types.map((value) => <option key={value} value={value}>{appraisalTypeLabel(value)}</option>)}</select>
                    <section className="tier_settings" aria-label="Tier rate tables">
                        <h2>Inspection and appraisal tier rates</h2>
                        <p>Dollar rates per item. Quantities 1–10 use column 10, 11–20 use column 20, and so on. Quantities above 50 use column 50. New bids use these rates and keep a copy of them.</p>
                        <div className="tier_settings_grid">{Object.entries(tableLabels).map(([key, title]) => <div className="tier_table_scroll" key={key}>
                            <table className="tier_settings_table"><caption>{title}</caption>
                                <thead><tr><th scope="col">Tier</th>{[10,20,30,40,50].map((quantity) => <th scope="col" key={quantity}>{quantity}</th>)}</tr></thead>
                                <tbody>{tables[key].map((row, tier) => <tr key={tier}><th scope="row">{tier + 1}</th>{row.map((value, column) => <td key={column}><span aria-hidden="true">$ </span><input aria-label={`${title}, tier ${tier + 1}, quantity ${(column + 1) * 10}`} type="number" min="0" max="1000000" step="0.01" required value={value} onChange={(event) => { const next = tables[key].map((entry) => [...entry]); next[tier][column] = event.target.value; setTables({ ...tables, [key]: next }); setNotice(''); }} /></td>)}</tr>)}</tbody>
                            </table>
                        </div>)}</div>
                        <button type="button" className="bid_form_cancel" onClick={() => { setTables(data.tierDefaults || tierTables); setNotice('Tier defaults restored. Click Save Settings to save.'); }}>Restore tier rate defaults</button>
                    </section>
                    <div className="settings_rule_grid">
                        {fields.map(({ field, label }) => {
                            if (field === 'completionDays') return <div key={field} className="settings_rule_card settings_rule_active">
                                <h3>{label}</h3>
                                <div className="settings_rule_controls">
                                    <label htmlFor="settings-completion-days"><span>Default days</span>
                                        <input id="settings-completion-days" aria-label="Completion days default" type="number" min="0" step="1" value={5} readOnly />
                                    </label>
                                </div>
                            </div>;
                            const percentage = assetPercentageFields.includes(field);
                            const term = rules[type].find((entry) => entry.field === field);
                            return <div key={field} className={`settings_rule_card${term ? ' settings_rule_active' : ''}`}><h3>{label}</h3><div className="settings_rule_controls">
                                <label><span>{percentage ? 'Percentage (%)' : checkboxFields.includes(field) ? 'Flat rate ($)' : 'Rate / fee'}</span><input id={`rule-${field}-multiplier`} aria-label={`${label} ${percentage ? 'percentage' : 'multiplier'}`} type="number" required={!!term} min="0" max={percentage ? 100 : 1000000} step="0.01" value={term?.multiplier ?? ''} onChange={(event) => update(field, { multiplier: event.target.value })} /></label>
                            </div></div>;
                        })}
                    </div>
                    <div className="actions"><button type="button" className="bid_form_cancel" onClick={() => {
                        setRestoreType(type);
                    }}>Restore defaults for this type</button><button type="submit" className="bid_form_save">{busy ? 'Saving…' : 'Save Settings'}</button></div>
                </fieldset>
            </ValidatedForm>
            </>}
        </main>
    </div>;
}
