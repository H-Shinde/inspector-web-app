import { useEffect, useRef, useState } from 'react';
import { bidFields, readBidList } from './bidFields';
import './Jobspage.css';
import { withJobDemoData, seedJobDemoSections } from './jobDemoData';
import navLogo from './bison_logo_nav.png';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';

DataTable.use(DT);

const itemColumns = [
    { data: 'name', title: 'Name', defaultContent: '' },
    { data: 'type', title: 'Type', defaultContent: '' },
    { data: 'make', title: 'Make', defaultContent: '' },
    { data: 'model', title: 'Model', defaultContent: '' },
    { data: 'year', title: 'Year', defaultContent: '' },
    { data: 'hoursMiles', title: 'Hours/Miles', defaultContent: '' },
    { data: null, title: 'Actions', orderable: false, searchable: false },
];

const itemDetailFields = [
    ['name', 'Name'], ['make', 'Make'], ['model', 'Model'],
    ['serialNumber', 'Serial number'], ['year', 'Year'], ['hoursMiles', 'Mileage/hours'],
    ['photoNumber', 'Photo#'], ['referenceNumber', 'Ref#'], ['comments', 'Comments'],
];

const sections = ['Job Information', 'Appraised Items', 'Non Appraised Items', 'Asset Valuation', 'Inspection Fees', 'Items'];
// Demo inspectors until an inspector directory is connected.
const inspectors = ['Alex Morgan', 'Jordan Lee', 'Taylor Brooks', 'Casey Rivera'];

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
        ['totalInspectedItems', 'Total Inspected Items'],
        ['totalNonInspectedItems', 'Total Non-Inspected Items'],
        ['totalAppraisal', 'Total Appraisal'],
        ['rush', 'Rush'],
        ['pdfDiscount', 'PDF Discount'],
        ['total', 'Total'],
        ['nonRushTotal', 'Non-Rush Total'],
        ['meNote', 'M&E Note'],
    ],
    'Asset Valuation': [
        ['fmvContinuedUse', 'FMV in Continued Use'],
        ['fairMarketValueRemoved', 'Fair Market Value Removed'],
        ['orderlyLiquidationValue', 'Orderly Liquidation Value'],
        ['forcedLiquidationValue', 'Forced Liquidation Value'],
        ['other', 'Other'],
        ['additionalLocations', 'Additional Locations'],
    ],
};

function Jobspage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [viewedItemId, setViewedItemId] = useState(null);
    const [itemEditor, setItemEditor] = useState(null);
    const itemDialog = useRef(null);
    useEffect(() => {
        if (itemEditor && !itemDialog.current.open) itemDialog.current.showModal();
    }, [itemEditor]);
    const closeItem = () => { itemDialog.current.close(); setItemEditor(null); };
    const [activeSection, setActiveSection] = useState('Job Information');
    const [valuationView, setValuationView] = useState('Current');
    const [historyStatus, setHistoryStatus] = useState('Accepted');
    const [details, setDetails] = useState(() => seedJobDemoSections(readBidList('availableJobs').map(withJobDemoData)));
    const [valuationHistory, setValuationHistory] = useState(() => readBidList('jobValuationHistory'));
    const updateField = (field, value) => {
        const updated = { ...details, [selectedId]: {
            ...details[selectedId], [activeSection]: { ...details[selectedId]?.[activeSection], [field]: value },
        } };
        sessionStorage.setItem('jobSectionDetails', JSON.stringify(updated));
        setDetails(updated);
    };
    const recordValuation = () => {
        if (!['Asset Valuation', 'Inspection Fees'].includes(activeSection)) return;
        const values = details[selectedId]?.[activeSection] || {};
        const latest = valuationHistory.find((entry) => entry.jobId === selectedId && (entry.section || 'Asset Valuation') === activeSection);
        if (!Object.keys(values).length || (latest && JSON.stringify(latest.values) === JSON.stringify(values))) return;
        const history = [{ jobId: selectedId, section: activeSection, status: job.status,
            savedAt: new Date().toISOString(), values: { ...values } }, ...valuationHistory];
        sessionStorage.setItem('jobValuationHistory', JSON.stringify(history));
        setValuationHistory(history);
    };
    const [jobs, setJobs] = useState(() => readBidList('availableJobs').map(withJobDemoData).map((job) => ({
        ...job,
        inspector: readBidList('jobAssignments').find((assignment) => assignment.jobId === job.id)?.inspector ?? job.inspector ?? '',
    })));
    const [selectedId, setSelectedId] = useState(() => {
        const requested = new URLSearchParams(window.location.search).get('jobId');
        return jobs.some((job) => String(job.id) === requested) ? requested : String(jobs[0]?.id ?? '');
    });
    const job = jobs.find((item) => String(item.id) === selectedId);
    const [acceptedJobId, setAcceptedJobId] = useState(() => sessionStorage.getItem('acceptedBidMessage'));
    useEffect(() => {
        if (acceptedJobId === selectedId) sessionStorage.removeItem('acceptedBidMessage');
    }, [acceptedJobId, selectedId]);
    useEffect(() => {
        if (!acceptedJobId) return;
        const dismissMessage = () => {
            sessionStorage.removeItem('acceptedBidMessage');
            setAcceptedJobId(null);
        };
        document.addEventListener('click', dismissMessage);
        document.addEventListener('keydown', dismissMessage);
        return () => {
            document.removeEventListener('click', dismissMessage);
            document.removeEventListener('keydown', dismissMessage);
        };
    }, [acceptedJobId]);
    const items = (Array.isArray(job?.items) ? job.items : []).map((item, index) => ({ ...item, itemId: item.itemId ?? `${job.id}-${index}` }));
    const persistItems = (updatedItems) => {
        const updated = { ...job, items: updatedItems };
        const updatedJobs = jobs.map((entry) => entry.id === job.id ? updated : entry);
        let stored = {};
        try { stored = JSON.parse(sessionStorage.getItem('jobItems') || '{}') || {}; } catch {}
        sessionStorage.setItem('jobItems', JSON.stringify({ ...stored, [job.id]: updatedItems }));
        sessionStorage.setItem('availableJobs', JSON.stringify(updatedJobs));
        sessionStorage.setItem('selectedJob', JSON.stringify(updated));
        setJobs(updatedJobs);
    };
    const editItemField = (field, value) => {
        const updated = { ...itemEditor.item, [field]: value };
        persistItems(items.map((item) => item.itemId === updated.itemId ? updated : item));
        setItemEditor({ ...itemEditor, item: updated });
    };
    const viewedItem = items.find((item) => item.itemId === viewedItemId);
    const selectJob = (event) => {
        setViewedItemId(null);
        const selected = jobs.find((item) => String(item.id) === event.target.value);
        if (!selected) return;
        setSelectedId(String(selected.id));
        sessionStorage.setItem('selectedJob', JSON.stringify(selected));
        window.history.replaceState(null, '', `/Jobspage?jobId=${encodeURIComponent(selected.id)}`);
    };
    const assignInspector = (event) => {
        if (!job) return;
        const inspector = event.target.value;
        const updated = { ...job, inspector };
        const updatedJobs = jobs.map((item) => item.id === job.id ? updated : item);
        sessionStorage.setItem('jobAssignments', JSON.stringify([
            ...readBidList('jobAssignments').filter((item) => item.jobId !== job.id),
            { jobId: job.id, inspector },
        ]));
        sessionStorage.setItem('availableJobs', JSON.stringify(updatedJobs));
        sessionStorage.setItem('selectedJob', JSON.stringify(updated));
        setJobs(updatedJobs);
    };
    const displayValue = (field) => {
        const value = job?.[field];
        if (value === undefined || value === null || value === '') return 'Not provided';
        return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    };

    return (
        <div className="frame_home bid_details_page job_details_page">
        <div className = 'nav_bar'>
            <img
                className="bison_logo_nav" src={navLogo} alt="Bison"
              
            />
            <div className='nav_links'>
                <div className='bids_box_selected'>
                  <p className='nav_bar_text'>Bids</p>
                </div>
                <div className='history_box'>
                  <p className='nav_bar_text'>History</p>
                </div>
                <div className='inspector_box'>
                  <p className='nav_bar_text'>Inspector</p>
                </div>
                <div className='clients_box'>
                  <p className='nav_bar_text'>Clients</p>
                </div>
                <div className='reports_box'>
                  <p className='nav_bar_text'>Reports</p>
                </div>
                <div className='messaging'>
                  <p className='nav_bar_text'>Messaging</p>
                </div>
            </div>
            <button type="button" className='burger_icon_position' aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                <div className = 'burger_icon_frame'>
                    <div className = 'top_bun'></div>
                    <div className = 'patty'></div>
                    <div className = 'bottom_bun'></div>
                </div>
            </button>
            {menuOpen && (
                <div className="hamburger_dropdown">
                    <button
                        className="logout_button"
                        onClick={() => {
                            window.location.href = "/";
                        }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
        <header className="bid_page_header">
            <div className="bid_details_toolbar">
                <button type="button" className="bid_back_button" onClick={() => { window.location.href = '/JobHomepage'; }}>
                    <span className="bid_back_icon" aria-hidden="true">←</span> Back
                </button>
                <h1 className="bidspage_header">Job Information</h1>
                <button type="button" className="bid_add_button" onClick={() => { window.location.href = '/AddJob'; }}>
                    <span className="bid_back_icon" aria-hidden="true">+</span> Add Job
                </button>
            </div>
        </header>
        <main className="job_details_layout">
            <aside className="job_sidebar" aria-label="Job sections">
                {sections.map((section) => (
                    <button type="button" key={section} className={activeSection === section ? 'active' : ''}
                        aria-current={activeSection === section ? 'page' : undefined}
                        onClick={() => { setActiveSection(section); setViewedItemId(null); }}>{section}</button>
                ))}
            </aside>
            <section className="job_details_content" aria-label={activeSection}>
                {acceptedJobId === selectedId && <p className="job_acceptance_message" role="status">Bid has been accepted.</p>}
                <div className="job_selectors">
                    <div>
                        <label htmlFor="job-selector">Jobs</label>
                        <select id="job-selector" value={selectedId} onChange={selectJob} disabled={!jobs.length}>
                            <option value="" disabled>Select a job</option>
                            {jobs.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="inspector-selector">Assign inspector</label>
                        <select id="inspector-selector" value={job?.inspector || ''} onChange={assignInspector} disabled={!job}>
                            <option value="">Unassigned</option>
                            {job?.inspector && !inspectors.includes(job.inspector) && <option>{job.inspector}</option>}
                            {inspectors.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                </div>
                {!job ? (
                    <p className="job_empty">Open View from the Jobs table to load job information.</p>
                ) : activeSection === 'Job Information' ? (
                    <div className="fieldsframe">
                        {bidFields.map(([field, label]) => (
                            <div className="bid_detail_field" key={field}>
                                <label htmlFor={`job-${field}`}>{label}</label>
                                <input id={`job-${field}`} type="text" readOnly value={displayValue(field)} />
                            </div>
                        ))}
                    </div>
                ) : sectionFields[activeSection] ? (
                    <div className="job_section_fields">
                        <h2>{activeSection}</h2>
                        {['Asset Valuation', 'Inspection Fees'].includes(activeSection) && (
                            <div className="valuation_controls">
                                <div className="valuation_switch" aria-label="Valuation view">
                                    {['Current', 'History'].map((view) => (
                                        <button type="button" key={view} aria-pressed={valuationView === view}
                                            className={valuationView === view ? 'active' : ''}
                                            onClick={() => { setValuationView(view); }}>{view}</button>
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
                        {['Asset Valuation', 'Inspection Fees'].includes(activeSection) && valuationView === 'History' ? (
                            <div>
                                {valuationHistory.filter((entry) => entry.jobId === selectedId && entry.status === historyStatus && (entry.section || 'Asset Valuation') === activeSection).length === 0 && (
                                    <div>
                                    <p className="job_empty">No {historyStatus.toLowerCase()} {activeSection.toLowerCase()} history for this job.</p>
                                    <div className="fieldsframe">
                                        {sectionFields[activeSection].map(([field, label]) => (
                                            <div className="bid_detail_field" key={field}>
                                                <label htmlFor={`history-empty-${field}`}>{label}</label>
                                                <input id={`history-empty-${field}`} type="text" readOnly value="" placeholder="No history available" />
                                            </div>
                                        ))}
                                    </div>
                                    </div>
                                )}
                                {valuationHistory.filter((entry) => entry.jobId === selectedId && entry.status === historyStatus && (entry.section || 'Asset Valuation') === activeSection).map((entry, index) => (
                                    <article className="valuation_history_entry" key={`${entry.savedAt}-${index}`}>
                                        <p>{new Date(entry.savedAt).toLocaleString()} · {entry.status}{entry.demo ? ' · Sample data' : ''}</p>
                                        <div className="fieldsframe">{sectionFields[activeSection].map(([field, label]) => (
                                            <div className="bid_detail_field" key={field}>
                                                <label htmlFor={`history-${index}-${field}`}>{label}</label>
                                                <input id={`history-${index}-${field}`} type="text" readOnly value={entry.values[field] ?? ''} placeholder="Not provided" />
                                            </div>
                                        ))}</div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <div className="fieldsframe">
                                    {sectionFields[activeSection].map(([field, label]) => (
                                        <div className="bid_detail_field" key={field}>
                                            <label htmlFor={`section-${field}`}>{label}</label>
                                            <input id={`section-${field}`} type={['other', 'additionalLocations', 'rush', 'meNote'].includes(field) ? 'text' : 'number'}
                                                min="0" step={['count', 'totalInspectedItems', 'totalNonInspectedItems'].includes(field) ? '1' : '0.01'}
                                                value={details[selectedId]?.[activeSection]?.[field] ?? ''}
                                                onChange={(event) => updateField(field, event.target.value)} onBlur={recordValuation} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeSection === 'Items' ? (
                    <div className="job_items_section">
                        <h2>Items</h2>
                        {viewedItem ? (
                            <div>
                                <button type="button" className="bid_back_button" onClick={() => setViewedItemId(null)}>← Back to Items</button>
                                <div className="fieldsframe">
                                    {itemDetailFields.map(([field, label]) => (
                                        <div className="bid_detail_field" key={field}>
                                            <label htmlFor={`view-item-${field}`}>{label}</label>
                                            {field === 'comments' ? (
                                                <textarea id={`view-item-${field}`} readOnly value={viewedItem[field] ?? 'Not provided'} rows={4} />
                                            ) : (
                                                <input id={`view-item-${field}`} type="text" readOnly value={viewedItem[field] ?? 'Not provided'} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                        <div className="bids_table_container">
                            <DataTable key={selectedId} data={items}
                                columns={itemColumns} className="bids_table"
                                slots={{ 6: (data, type, row) => (
                                    <div className="action_buttons">
                                        <button type="button" className="view" title="View item" aria-label={`View ${row.name}`} onClick={() => setViewedItemId(row.itemId)}><FaEye /></button>
                                        <button type="button" className="edit" title="Edit item" aria-label={`Edit ${row.name}`} onClick={() => setItemEditor({ mode: 'edit', item: { ...row } })}><FaEdit /></button>
                                        <button type="button" className="delete_icon" title="Delete item" aria-label={`Delete ${row.name}`} onClick={() => persistItems(items.filter((item) => item.itemId !== row.itemId))}><FaTrash /></button>
                                    </div>
                                ) }}
                                options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                                    language: { emptyTable: 'No items have been recorded for this job.' } }} />
                        </div>
                        )}
                    </div>
                ) : (
                    <div className="job_section_empty">
                        <h2>{activeSection}</h2>
                        <p>No {activeSection.toLowerCase()} have been recorded for this job.</p>
                    </div>
                )}
            </section>
        </main>
        <dialog ref={itemDialog} className="popup" aria-labelledby="item-dialog-title" onCancel={(event) => { event.preventDefault(); closeItem(); }}>
            {itemEditor && (
                <div>
                    <div className="bid_form_header">
                        <h2 id="item-dialog-title">{itemEditor.mode === 'edit' ? 'Edit item' : 'Item information'}</h2>
                        <button type="button" className="bid_form_close" aria-label="Close item" onClick={closeItem}>×</button>
                    </div>
                    <div className="bid_form_body bid_form_grid">
                        {[...itemDetailFields, ['type', 'Type']].map(([field, title]) => (
                            <div className="bid_form_field" key={field}>
                                <label htmlFor={`item-${field}`}>{title}</label>
                                <input id={`item-${field}`} type="text" value={itemEditor.item[field] ?? ''}
                                    readOnly={itemEditor.mode === 'view'} onChange={(event) => editItemField(field, event.target.value)} />
                            </div>
                        ))}
                    </div>
                    <div className="actions"><button type="button" className="bid_form_cancel" onClick={closeItem}>Done</button></div>
                </div>
            )}
        </dialog>
        <footer className="bid_page_footer" />
        </div>
    );
}

export default Jobspage;
