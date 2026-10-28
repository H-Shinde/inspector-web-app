import { useEffect, useRef, useState } from 'react';
import useBidSettings from './useBidSettings';
import { saveBidSettings } from './bidSettingsApi';
import { appraisalTypeLabel } from './appraisalTypes';
import { calculateConfiguredTotal, assetPercentageFields } from './bidCalculation';
import ValidatedForm from './ValidatedForm';
import LogoutButton from './LogoutButton';
import navLogo from './bison_logo_nav.png';
import './Settings.css';

export default function Settings() {
    const { data, setData, loading, error, retry } = useBidSettings();
    const [rules, setRules] = useState(null);
    const [type, setType] = useState('Business Valuation (BV)');
    const [busy, setBusy] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const saving = useRef(false);
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    const [sample, setSample] = useState({ bidAmount: '1000', discount: '50', rushDiscount: '25', additionalCharges: '100' });
    useEffect(() => { if (data) setRules(data.rules); }, [data]);
    const fields = (data?.fields || []).filter(({ field }) => type !== 'Machinery & Equipment (M&E)' || field !== 'additionalCharges');
    const update = (field, changes) => {
        setNotice('');
        setRules((previous) => {
            const existing = previous[type].find((term) => term.field === field);
            const others = previous[type].filter((term) => term.field !== field);
            return { ...previous, [type]: changes.operation === 'ignore' ? others : [...others, { field, operation: 'add', multiplier: assetPercentageFields.includes(field) ? '5.00' : '1.00', when: 'always', ...existing, ...changes, ...(assetPercentageFields.includes(field) ? { mode: 'percentage' } : {}) }] };
        });
    };
    const save = async (event) => {
        event.preventDefault();
        if (saving.current) return;
        saving.current = true; setBusy(true); setSaveError(''); setNotice('');
        try { const result = await saveBidSettings(rules); setData(result); setNotice('Bid calculation settings saved.'); }
        catch (error) { setSaveError(error.message); }
        finally { saving.current = false; setBusy(false); }
    };
    return <div className="frame_home bid_details_page settings_page">
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
                    <legend>Bid calculation</legend>
                    <label htmlFor="settings-type">Bid type</label>
                    <select id="settings-type" value={type} onChange={(event) => setType(event.target.value)}>{data.types.map((value) => <option key={value} value={value}>{appraisalTypeLabel(value)}</option>)}</select>
                    <p>Numeric fields use value × multiplier. Asset Valuation checkboxes add a percentage of the subtotal after fixed fees and discounts. Percentages add together without compounding. Other checkboxes use fixed fees. Each contribution rounds to cents.</p>
                    <div className="settings_rule_grid">
                        {fields.map(({ field, label }) => {
                            const percentage = assetPercentageFields.includes(field);
                            const term = rules[type].find((entry) => entry.field === field);
                            return <div key={field} className={`settings_rule_card${term ? ' settings_rule_active' : ''}`}><h3>{label}</h3><div className="settings_rule_controls">
                                <label><span>Operation</span><select aria-label={`${label} operation`} value={term?.operation || 'ignore'} onChange={(event) => update(field, { operation: event.target.value })}><option value="ignore">Ignore</option><option value="add">Add</option>{!percentage && <option value="subtract">Subtract</option>}</select></label>
                                <label><span>{percentage ? 'Percentage (%)' : 'Rate / fee'}</span><input id={`rule-${field}-multiplier`} aria-label={`${label} ${percentage ? 'percentage' : 'multiplier'}`} type="number" required={!!term} disabled={!term} min="0" max={percentage ? 100 : 1000000} step="0.01" value={term?.multiplier ?? ''} onChange={(event) => update(field, { multiplier: event.target.value })} /></label>
                                <label><span>Apply when</span><select aria-label={`${label} condition`} disabled={!term} value={term?.when || 'always'} onChange={(event) => update(field, { when: event.target.value })}><option value="always">Always</option><option value="rush">Rush checked</option><option value="notRush">Rush unchecked</option><option value="pdfOnly">PDF Only checked</option><option value="notPdfOnly">PDF Only unchecked</option></select></label>
                            </div></div>;
                        })}
                    </div>
                    <div className="actions"><button type="button" className="bid_form_cancel" onClick={() => { setRules((previous) => ({ ...previous, [type]: data.defaults[type].map((term) => ({ ...term })) })); setNotice(''); }}>Restore defaults for this type</button><button type="submit" className="bid_form_save">{busy ? 'Saving…' : 'Save Settings'}</button></div>
                </fieldset>
            </ValidatedForm>
                <section className="settings_preview" aria-label="Calculation preview">
                    <h2>Try the calculation</h2><p>This preview uses your unsaved settings. Preview values are not saved.</p>
                    <div className="bid_form_grid">{fields.filter(({ field }) => rules[type].some((term) => term.field === field) || ['rush', 'pdfOnly'].includes(field)).map(({ field, label, checkbox }) => <div className="bid_form_field" key={field}>
                        <label htmlFor={`sample-${field}`}>{label}</label><input id={`sample-${field}`} type={checkbox ? 'checkbox' : 'number'} min="0" step="0.01" value={checkbox ? undefined : sample[field] ?? ''} checked={checkbox ? !!sample[field] : undefined} onChange={(event) => setSample({ ...sample, [field]: checkbox ? event.target.checked : event.target.value })} />
                    </div>)}</div>
                    <p aria-live="polite">Preview total: <strong>${calculateConfiguredTotal({ ...sample, appraisalType: type, calculationRules: rules })}</strong></p>
                </section>
            </>}
        </main>
    </div>;
}
