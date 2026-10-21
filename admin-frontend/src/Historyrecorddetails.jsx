import { getBidSections } from './bidSections';
import { useState } from 'react';
import { FaEye } from 'react-icons/fa';
import { bidFields, readBidList } from './bidFields';
import ItemImage from './ItemImage';
import './Jobspage.css';

// Read-only view of a history record, laid out like the Jobs screen.
const itemColumns = [['name', 'Name'], ['type', 'Type'], ['make', 'Make'], ['model', 'Model'], ['year', 'Year'], ['hoursMiles', 'Hours/Miles']];
const itemDetailFields = [
    ['name', 'Name'], ['type', 'Type'], ['make', 'Make'], ['model', 'Model'],
    ['serialNumber', 'Serial number'], ['year', 'Year'], ['hoursMiles', 'Mileage/hours'],
    ['photoNumber', 'Photo#'], ['referenceNumber', 'Ref#'], ['comments', 'Comments'],
];
const sectionGroups = {
    'Item Appraisal': ['Appraised Items', 'Non Appraised Items'],
    'Valuation & Fees': ['Asset Valuation', 'Inspection Fees'],
};
const rateFields = [
    ['inspectionRate', 'Inspection rate'],
    ['customInspectionRate', 'Custom inspection rate'],
    ['additionalInspectionCharge', 'Additional inspection charge'],
    ['appraisalRate', 'Appraisal rate'],
    ['customAppraisalRate', 'Custom appraisal rate'],
    ['additionalAppraisalCharge', 'Additional appraisal charge'],
];
const sectionFields = {
    'Appraised Items': [['count', '# of appraised items'], ...rateFields],
    'Non Appraised Items': [['count', '# of non appraised items'], ...rateFields],
    'Inspection Fees': [
        ['totalInspectedItems', 'Total Inspected Items'], ['totalNonInspectedItems', 'Total Non-Inspected Items'],
        ['totalAppraisal', 'Total Appraisal'], ['rush', 'Rush'], ['pdfDiscount', 'PDF Discount'],
        ['total', 'Total'], ['nonRushTotal', 'Non-Rush Total'], ['meNote', 'M&E Note'],
    ],
    'Asset Valuation': [
        ['fmvContinuedUse', 'FMV in Continued Use'], ['fairMarketValueRemoved', 'Fair Market Value Removed'],
        ['orderlyLiquidationValue', 'Orderly Liquidation Value'], ['forcedLiquidationValue', 'Forced Liquidation Value'],
        ['other', 'Other'], ['additionalLocations', 'Additional Locations'],
    ],
};

const readObject = (key) => {
    try { return JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch { return {}; }
};
const show = (value) => {
    if (value === undefined || value === null || value === '') return 'Not provided';
    return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
};
const formatDate = (value) => value ? new Date(value).toLocaleString() : '';

function ReadOnlyField({ id, label, value, placeholder, multiline }) {
    return (
        <div className="bid_detail_field">
            <label htmlFor={id}>{label}</label>
            {multiline
                ? <textarea id={id} readOnly rows={4} value={value} placeholder={placeholder} />
                : <input id={id} type="text" readOnly value={value} placeholder={placeholder} />}
        </div>
    );
}

export default function HistoryRecordDetails({ record, onBack }) {
    const isJob = record.recordType === 'Job';
    const recordFields = isJob ? bidFields : getBidSections(record.appraisalType).flatMap(([, fields]) => fields);
    const infoSection = isJob ? 'Job Information' : 'Bid Information';
    const sections = isJob ? [infoSection, ...Object.keys(sectionGroups), 'Items', 'Assigned Inspector'] : [infoSection];
    const [activeSection, setActiveSection] = useState(infoSection);
    const [valuationView, setValuationView] = useState('Current');
    const [historyStatus, setHistoryStatus] = useState('Accepted');
    const [viewedItemId, setViewedItemId] = useState(null);

    const recordId = String(record.id);
    const sectionDetails = record.sectionDetails ?? readObject('jobSectionDetails')[record.id] ?? {};
    const valuationHistory = record.valuationHistory
        ?? readBidList('jobValuationHistory').filter((entry) => String(entry.jobId) === recordId);
    const items = (Array.isArray(record.items) ? record.items : []).map((item, index) => ({ ...item, itemId: item.itemId ?? `${recordId}-${index}` }));
    const viewedItem = items.find((item) => item.itemId === viewedItemId);
    const statusSlug = String(record.status ?? '').toLowerCase().replace(/\s+/g, '-');
    const dateLabel = record.status === 'Completed' ? 'Completed on' : 'Declined on';
    const dateValue = formatDate(record.completedAt ?? record.deletedAt);

    return (
        <div className="history_record_details">
            <header className="bid_page_header">
                <div className="bid_details_toolbar">
                    <button type="button" className="bid_back_button" onClick={onBack}>
                        <span className="bid_back_icon" aria-hidden="true">←</span> Back to History
                    </button>
                    <h1 className="bidspage_header">{activeSection}</h1>
                    <span className={`history_status history_status_${statusSlug}`}>{record.status}</span>
                </div>
            </header>
            <div className="job_details_layout">
                <aside className="job_sidebar" aria-label={`${record.recordType} sections`}>
                    {sections.map((section) => (
                        <button type="button" key={section} className={activeSection === section ? 'active' : ''}
                            aria-current={activeSection === section ? 'page' : undefined}
                            onClick={() => { setActiveSection(section); setViewedItemId(null); }}>{section}</button>
                    ))}
                </aside>
                <section className="job_details_content" aria-label={activeSection}>
                    {activeSection === infoSection ? (
                        <div className="fieldsframe">
                            <ReadOnlyField id="record-status" label="Status" value={show(record.status)} />
                            {dateValue && <ReadOnlyField id="record-status-date" label={dateLabel} value={dateValue} />}
                            {recordFields.filter(([field]) => field !== 'status').map(([field, label]) => (
                                <ReadOnlyField key={field} id={`record-${field}`} label={label} value={show(record[field])} />
                            ))}
                        </div>
                    ) : sectionGroups[activeSection] ? (
                        <div className="job_section_fields">
                            {sectionGroups[activeSection].map((sectionName, groupIndex) => {
                                const hasHistory = ['Asset Valuation', 'Inspection Fees'].includes(sectionName);
                                const entries = valuationHistory.filter((entry) => entry.status === historyStatus && (entry.section || 'Asset Valuation') === sectionName);
                                return (
                                    <section className="job_combined_group" key={sectionName} aria-label={sectionName}>
                                        <h3>{sectionName}</h3>
                                        {groupIndex === 0 && hasHistory && (
                                            <div className="valuation_controls">
                                                <div className="valuation_switch" aria-label="Valuation view">
                                                    {['Current', 'History'].map((view) => (
                                                        <button type="button" key={view} aria-pressed={valuationView === view}
                                                            className={valuationView === view ? 'active' : ''}
                                                            onClick={() => setValuationView(view)}>{view}</button>
                                                    ))}
                                                </div>
                                                {valuationView === 'History' && (
                                                    <label className="valuation_status">Status
                                                        <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
                                                            <option>Accepted</option><option>Pending</option><option>Declined</option>
                                                        </select>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                        {hasHistory && valuationView === 'History' ? (
                                            <div>
                                                {entries.length === 0 && <p className="job_empty">No {historyStatus.toLowerCase()} {sectionName.toLowerCase()} history for this job.</p>}
                                                {entries.map((entry, index) => (
                                                    <article className="valuation_history_entry" key={`${entry.savedAt}-${index}`}>
                                                        <p>{formatDate(entry.savedAt)} · {entry.status}{entry.demo ? ' · Sample data' : ''}</p>
                                                        <div className="fieldsframe">
                                                            {sectionFields[sectionName].map(([field, label]) => (
                                                                <ReadOnlyField key={field} id={`history-${sectionName}-${index}-${field}`} label={label}
                                                                    value={entry.values?.[field] ?? ''} placeholder="Not provided" />
                                                            ))}
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="fieldsframe">
                                                {sectionFields[sectionName].map(([field, label]) => (
                                                    <ReadOnlyField key={field} id={`section-${sectionName}-${field}`} label={label}
                                                        value={sectionDetails[sectionName]?.[field] ?? ''} placeholder="Not provided" />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    ) : activeSection === 'Items' ? (
                        <div className="job_items_section">
                            <div className="job_items_header"><h2>Items</h2></div>
                            {viewedItem ? (
                                <div>
                                    <button type="button" className="bid_back_button" onClick={() => setViewedItemId(null)}>← Back to Items</button>
                                    <ItemImage item={viewedItem} />
                                    <div className="fieldsframe">
                                        {itemDetailFields.map(([field, label]) => (
                                            <ReadOnlyField key={field} id={`view-item-${field}`} label={label}
                                                value={show(viewedItem[field])} multiline={field === 'comments'} />
                                        ))}
                                    </div>
                                </div>
                            ) : items.length === 0 ? (
                                <p className="job_empty">No items have been recorded for this job.</p>
                            ) : (
                                <div className="bids_table_container">
                                    <table className="bids_table">
                                        <thead><tr>{itemColumns.map(([field, title]) => <th key={field}>{title}</th>)}<th>Actions</th></tr></thead>
                                        <tbody>
                                            {items.map((item) => (
                                                <tr key={item.itemId}>
                                                    {itemColumns.map(([field]) => <td key={field}>{item[field] ?? ''}</td>)}
                                                    <td><div className="action_buttons">
                                                        <button type="button" className="view" title="View item" aria-label={`View ${item.name}`} onClick={() => setViewedItemId(item.itemId)}><FaEye /></button>
                                                    </div></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="job_assign_inspector">
                            <div className="fieldsframe">
                                <ReadOnlyField id="record-assigned-inspector" label="Assigned inspector" value={show(record.inspector)} />
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}   