import ItemImage from './ItemImage';
import { saveItemImage, deleteItemImage } from './itemImages';
import { restoreJobStatus } from './jobStatus';
import SendJobToInspector from './SendJobToInspector';
import { completeJob, isCompletedJob, isDeletedRecord } from './historyRecords';
import { useEffect, useRef, useState } from 'react';
import { bidFields, readBidList } from './bidFields';
import './Jobspage.css';
import { assignInspectorToJob, getInspectors, selectGlobalInspector, useSelectedInspector } from './inspectorSelection';
import { withJobDemoData, seedJobDemoSections } from './jobDemoData';
import { sortInspectorsByDistance } from './inspectorDistance';
import { csvToItems } from './itemCsv';
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

const sectionGroups = {
    'Item Appraisal': ['Appraised Items', 'Non Appraised Items'],
    'Valuation & Fees': ['Asset Valuation', 'Inspection Fees'],
};
const sections = ['Job Information', ...Object.keys(sectionGroups), 'Items', 'Assign Inspector'];

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
    const selectedInspector = useSelectedInspector();
    const inspectorList = getInspectors();
    const inspectors = inspectorList.map((inspector) => inspector.name);
    const [menuOpen, setMenuOpen] = useState(false);
    const [viewedItemId, setViewedItemId] = useState(null);
    const [itemImageFile, setItemImageFile] = useState(null);
    const [itemImageError, setItemImageError] = useState('');
    const [savingItem, setSavingItem] = useState(false);
    const [itemImagePreview, setItemImagePreview] = useState('');
    useEffect(() => {
        if (!itemImageFile) { setItemImagePreview(''); return; }
        const url = URL.createObjectURL(itemImageFile); setItemImagePreview(url);
        return () => URL.revokeObjectURL(url);
    }, [itemImageFile]);
    const [itemEditor, setItemEditor] = useState(null);
    const [itemAdded, setItemAdded] = useState(false);
    useEffect(() => {
        if (!itemAdded) return;
        const dismissMessage = () => setItemAdded(false);
        document.addEventListener('click', dismissMessage, true);
        return () => document.removeEventListener('click', dismissMessage, true);
    }, [itemAdded]);
    const [csvMessage, setCsvMessage] = useState(null);
    const csvInput = useRef(null);
    useEffect(() => {
        if (!csvMessage) return;
        const dismissMessage = () => setCsvMessage(null);
        document.addEventListener('click', dismissMessage, true);
        return () => document.removeEventListener('click', dismissMessage, true);
    }, [csvMessage]);
    const itemDialog = useRef(null);
    const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
    const completeDialog = useRef(null);
    useEffect(() => {
        if (completeConfirmOpen && completeDialog.current && !completeDialog.current.open) completeDialog.current.showModal();
    }, [completeConfirmOpen]);
    const closeCompleteConfirm = () => {
        if (completeDialog.current?.open) completeDialog.current.close();
        setCompleteConfirmOpen(false);
    };
    useEffect(() => {
        if (itemEditor && !itemDialog.current.open) itemDialog.current.showModal();
    }, [itemEditor]);
    const closeItem = () => { if (savingItem) return; itemDialog.current.close(); setItemEditor(null); setItemImageFile(null); setItemImageError(''); };
    const [activeSection, setActiveSection] = useState('Job Information');
    const [valuationView, setValuationView] = useState('Current');
    const [historyStatus, setHistoryStatus] = useState('Accepted');
    const [details, setDetails] = useState(() => seedJobDemoSections(readBidList('availableJobs').map(withJobDemoData)));
    const [valuationHistory, setValuationHistory] = useState(() => readBidList('jobValuationHistory'));
    const updateField = (sectionName, field, value) => {
        const updated = { ...details, [selectedId]: {
            ...details[selectedId], [sectionName]: { ...details[selectedId]?.[sectionName], [field]: value },
        } };
        sessionStorage.setItem('jobSectionDetails', JSON.stringify(updated));
        setDetails(updated);
    };
    const recordValuation = (sectionName) => {
        if (!['Asset Valuation', 'Inspection Fees'].includes(sectionName)) return;
        const values = details[selectedId]?.[sectionName] || {};
        const latest = valuationHistory.find((entry) => entry.jobId === selectedId && (entry.section || 'Asset Valuation') === sectionName);
        if (!Object.keys(values).length || (latest && JSON.stringify(latest.values) === JSON.stringify(values))) return;
        const history = [{ jobId: selectedId, section: sectionName, status: job.status,
            savedAt: new Date().toISOString(), values: { ...values } }, ...valuationHistory];
        sessionStorage.setItem('jobValuationHistory', JSON.stringify(history));
        setValuationHistory(history);
    };
    const [jobs, setJobs] = useState(() => readBidList('availableJobs').filter((job) => !isCompletedJob(job.id) && !isDeletedRecord('Job', job.id)).map(withJobDemoData).map((job) => ({
        ...job, status: restoreJobStatus({ ...job, inspector: readBidList('jobAssignments').find((assignment) => String(assignment.jobId) === String(job.id))?.inspector ?? job.inspector }),
        inspector: readBidList('jobAssignments').find((assignment) => assignment.jobId === job.id)?.inspector ?? job.inspector ?? '',
    })));
    const [selectedId] = useState(() => {
        const requested = new URLSearchParams(window.location.search).get('jobId');
        return requested ?? String(jobs[0]?.id ?? '');
    });
    const job = jobs.find((item) => String(item.id) === selectedId);
    const [pendingInspector, setPendingInspector] = useState(() => selectedInspector?.name ?? job?.inspector ?? '');
    useEffect(() => { setPendingInspector(job?.inspector ?? ''); }, [job?.inspector]);
    const sortedInspectors = job ? sortInspectorsByDistance(inspectorList, job) : [];
    const jobLocation = job ? [job.city, job.state].filter(Boolean).join(', ') : '';
    useEffect(() => {
        if (!job) return;
        if (selectedInspector && job.inspector !== selectedInspector.name) {
            const updated = assignInspectorToJob(job, selectedInspector.name);
            setJobs((current) => current.map((entry) => entry.id === job.id ? updated : entry));
        } else {
            sessionStorage.setItem('selectedJob', JSON.stringify(job));
        }
    }, [job, selectedInspector?.id, selectedInspector?.name]);
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
        if (itemEditor.mode === 'edit') {
            persistItems(items.map((item) => item.itemId === updated.itemId ? updated : item));
        }
        setItemEditor({ ...itemEditor, item: updated });
    };
    const addItem = async (event) => {
        event.preventDefault();
        if (itemEditor.mode !== 'add' || savingItem) return;
        const name = itemEditor.item.name?.trim();
        if (!name) return;
        setItemImageError('');
        const itemId = crypto.randomUUID();
        const imageId = itemImageFile ? `job-${job.id}-item-${itemId}` : null;
        setSavingItem(true);
        try {
            if (imageId) await saveItemImage(imageId, itemImageFile);
            persistItems([...items, { ...itemEditor.item, name, itemId, ...(imageId ? { imageId, imageName: itemImageFile.name } : {}) }]);
            setViewedItemId(null);
            itemDialog.current.close(); setItemEditor(null); setItemImageFile(null); setItemImageError('');
            setItemAdded(true);
        } catch {
            if (imageId) await deleteItemImage(imageId).catch(() => {});
            setItemImageError('Unable to save the item. Please try again.');
        } finally { setSavingItem(false); }
    };
    const importCsv = (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const { items: imported, skipped, ignoredColumns } = csvToItems(String(reader.result));
                if (!imported.length) throw new Error('No items were found in the CSV. Each row needs a name.');
                persistItems([...items, ...imported.map((item) => ({ ...item, itemId: crypto.randomUUID() }))]);
                setViewedItemId(null);
                setItemAdded(false);
                const parts = [`Imported ${imported.length} ${imported.length === 1 ? 'item' : 'items'} from ${file.name}.`];
                if (skipped) parts.push(`${skipped} ${skipped === 1 ? 'row was' : 'rows were'} skipped because the name was missing.`);
                if (ignoredColumns.length) parts.push(`Ignored columns: ${ignoredColumns.join(', ')}.`);
                setCsvMessage({ error: false, text: parts.join(' ') });
            } catch (error) {
                setCsvMessage({ error: true, text: error.message });
            }
        };
        reader.onerror = () => setCsvMessage({ error: true, text: 'Could not read that file.' });
        reader.readAsText(file);
        input.value = '';
    };
    const viewedItem = items.find((item) => item.itemId === viewedItemId);
    const assignInspector = () => {
        if (!job) return;
        const inspector = pendingInspector;
        selectGlobalInspector(getInspectors().find((entry) => entry.name === inspector)?.id ?? null);
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
                  <a className='nav_bar_text' href='/History' style={{ textDecoration: 'none' }}>History</a>
                </div>
                <div className='inspector_box'>
                  <a className='nav_bar_text' href='/Inspector' style={{ textDecoration: 'none' }}>Inspector</a>
                </div>
                <div className='clients_box'>
                  <a className='nav_bar_text' href='/Clients' style={{ textDecoration: 'none' }}>Clients</a>
                </div>
                <div className='reports_box'>
                  <a className='nav_bar_text' href='/Reports' style={{ textDecoration: 'none' }}>Reports</a>
                </div>
                <div className='messaging'>
                  <a className='nav_bar_text' href='/Messaging' style={{ textDecoration: 'none' }}>Messaging</a>
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
                <h1 className="bidspage_header">{activeSection}</h1>
                {job && <button type="button" className="bid_add_button" onClick={() => setCompleteConfirmOpen(true)}>Mark Complete</button>}

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
                {job?.inspector && <div className="job_send_controls"><SendJobToInspector job={job} sections={details[selectedId]} /></div>}
                {acceptedJobId === selectedId && <p className="job_acceptance_message" role="status">Bid has been accepted.</p>}
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
                ) : sectionGroups[activeSection] ? (
                    <div className="job_section_fields">
                        {sectionGroups[activeSection].map((sectionName, groupIndex) => (
                        <section className="job_combined_group" key={sectionName} aria-label={sectionName}>
                        <h3>{sectionName}</h3>
                        {groupIndex === 0 && ['Asset Valuation', 'Inspection Fees'].includes(sectionName) && (
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
                        {['Asset Valuation', 'Inspection Fees'].includes(sectionName) && valuationView === 'History' ? (
                            <div>
                                {valuationHistory.filter((entry) => entry.jobId === selectedId && entry.status === historyStatus && (entry.section || 'Asset Valuation') === sectionName).length === 0 && (
                                    <div>
                                    <p className="job_empty">No {historyStatus.toLowerCase()} {sectionName.toLowerCase()} history for this job.</p>
                                    <div className="fieldsframe">
                                        {sectionFields[sectionName].map(([field, label]) => (
                                            <div className="bid_detail_field" key={field}>
                                                <label htmlFor={`history-empty-${sectionName}-${field}`}>{label}</label>
                                                <input id={`history-empty-${sectionName}-${field}`} type="text" readOnly value="" placeholder="No history available" />
                                            </div>
                                        ))}
                                    </div>
                                    </div>
                                )}
                                {valuationHistory.filter((entry) => entry.jobId === selectedId && entry.status === historyStatus && (entry.section || 'Asset Valuation') === sectionName).map((entry, index) => (
                                    <article className="valuation_history_entry" key={`${entry.savedAt}-${index}`}>
                                        <p>{new Date(entry.savedAt).toLocaleString()} · {entry.status}{entry.demo ? ' · Sample data' : ''}</p>
                                        <div className="fieldsframe">{sectionFields[sectionName].map(([field, label]) => (
                                            <div className="bid_detail_field" key={field}>
                                                <label htmlFor={`history-${sectionName}-${index}-${field}`}>{label}</label>
                                                <input id={`history-${sectionName}-${index}-${field}`} type="text" readOnly value={entry.values[field] ?? ''} placeholder="Not provided" />
                                            </div>
                                        ))}</div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <div className="fieldsframe">
                                    {sectionFields[sectionName].map(([field, label]) => (
                                        <div className="bid_detail_field" key={field}>
                                            <label htmlFor={`section-${sectionName}-${field}`}>{label}</label>
                                            <input id={`section-${sectionName}-${field}`} type={['other', 'additionalLocations', 'rush', 'meNote'].includes(field) ? 'text' : 'number'}
                                                min="0" step={['count', 'totalInspectedItems', 'totalNonInspectedItems'].includes(field) ? '1' : '0.01'}
                                                value={details[selectedId]?.[sectionName]?.[field] ?? ''}
                                                onChange={(event) => updateField(sectionName, field, event.target.value)} onBlur={() => recordValuation(sectionName)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        </section>
                        ))}
                    </div>
                ) : activeSection === 'Assign Inspector' ? (
                    <div className="job_assign_inspector">
                        <p className="job_empty">Choose the inspector responsible for {job.name}'s job.</p>
                        <div className="job_assign_field">
                            <label htmlFor="inspector-selector">Assign inspector</label>
                            <select id="inspector-selector" value={pendingInspector} onChange={(event) => setPendingInspector(event.target.value)}>
                                <option value="">Unassigned</option>
                                {job.inspector && !inspectors.includes(job.inspector) && <option>{job.inspector}</option>}
                                {sortedInspectors.map(({ inspector, distance }) => (
                                    <option key={inspector.id ?? inspector.name} value={inspector.name}>
                                        {distance === null ? inspector.name : `${inspector.name} (${distance.toFixed(1)} mi)`}
                                    </option>
                                ))}
                            </select>
                            <p className="job_assign_hint">
                                {jobLocation ? `Sorted by distance from ${jobLocation}. ` : ''}Inspectors with no known location are listed last.
                            </p>
                        </div>
                        <button type="button" className="add_bid_button job_assign_button"
                            disabled={pendingInspector === (job.inspector ?? '')} onClick={assignInspector}>Assign inspector</button>
                    </div>
                ) : activeSection === 'Items' ? (
                    <div className="job_items_section">
                        <div className="job_items_header">
                            <h2>Items</h2>
                            <div className="job_items_actions">
                                <button type="button" className="add_bid_button" onClick={() => csvInput.current?.click()}>Upload CSV</button>
                                <input ref={csvInput} type="file" accept=".csv,text/csv" hidden aria-label="Upload items CSV" onChange={importCsv} />
                                <button type="button" className="add_bid_button" onClick={() => setItemEditor({ mode: 'add', item: {} })}>+ Add item</button>
                            </div>
                        </div>
                        <p className="job_csv_hint">CSV columns: Name (required), Type, Make, Model, Serial number, Year, Hours/Miles, Photo#, Ref#, Comments. Rows are added to the existing items.</p>
                        {csvMessage && <p className={csvMessage.error ? 'job_csv_error' : 'job_acceptance_message'} role={csvMessage.error ? 'alert' : 'status'}>{csvMessage.text}</p>}
                        {itemAdded && <p className="job_acceptance_message" role="status">Item has been added.</p>}
                        {viewedItem ? (
                            <div>
                                <button type="button" className="bid_back_button" onClick={() => setViewedItemId(null)}>← Back to Items</button>
                                <ItemImage item={viewedItem} />
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
                <form onSubmit={addItem}>
                    <div className="bid_form_header">
                        <h2 id="item-dialog-title">{itemEditor.mode === 'add' ? 'Add item' : 'Edit item'}</h2>
                        <button type="button" className="bid_form_close" aria-label="Close item" onClick={closeItem} disabled={savingItem}>×</button>
                    </div>
                    <div className="bid_form_body bid_form_grid">
                        {itemEditor.mode === 'add' && <div className="bid_form_field bid_form_full">
                            <label htmlFor="item-image">Item image</label>
                            <input id="item-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={savingItem} onChange={(event) => {
                                const file = event.target.files?.[0];
                                setItemImageFile(null); setItemImageError('');
                                if (!file) return;
                                if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setItemImageError('Choose a PNG, JPEG, WebP, or GIF image.'); event.target.value = ''; return; }
                                if (file.size > 10 * 1024 * 1024) { setItemImageError('Choose an image smaller than 10 MB.'); event.target.value = ''; return; }
                                setItemImageFile(file);
                            }} />
                            <p className="bid_form_hint">PNG, JPEG, WebP, or GIF, up to 10 MB.</p>
                            {itemImagePreview && <div className="job_item_photo"><img src={itemImagePreview} alt="Selected item" /><button type="button" className="bid_form_cancel" disabled={savingItem} onClick={() => { setItemImageFile(null); setItemImageError(''); document.getElementById('item-image').value = ''; }}>Remove image</button></div>}
                        </div>}
                        {itemImageError && <p className="add_bid_error" role="alert">{itemImageError}</p>}
                        {itemEditor.mode !== 'add' && <ItemImage item={itemEditor.item} />}
                        {[...itemDetailFields, ['type', 'Type']].map(([field, title]) => (
                            <div className="bid_form_field" key={field}>
                                <label htmlFor={`item-${field}`}>{title}</label>
                                <input id={`item-${field}`} type="text" value={itemEditor.item[field] ?? ''}
                                    required={itemEditor.mode === 'add' && field === 'name'}
                                    disabled={savingItem} readOnly={itemEditor.mode === 'view'} onChange={(event) => editItemField(field, event.target.value)} />
                            </div>
                        ))}
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" disabled={savingItem} onClick={closeItem}>{itemEditor.mode === 'add' ? 'Cancel' : 'Done'}</button>
                        {itemEditor.mode === 'add' && <button type="submit" className="bid_form_save" disabled={!itemEditor.item.name?.trim() || savingItem}>{savingItem ? 'Saving…' : 'Add item'}</button>}
                    </div>
                </form>
            )}
        </dialog>
        <dialog ref={completeDialog} className="popup confirm_popup" aria-labelledby="complete-job-title" onCancel={(event) => { event.preventDefault(); closeCompleteConfirm(); }}>
            {completeConfirmOpen && job && (
                <div>
                    <div className="confirm_body">
                        <h2 id="complete-job-title">Mark this job complete?</h2>
                        <p>Are you sure you want to mark the job for <strong>{job.name}</strong> as complete? It will move to History.</p>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeCompleteConfirm}>Cancel</button>
                        <button type="button" className="bid_form_save" onClick={() => { completeJob(job); window.location.href = '/History'; }}>Complete job</button>
                    </div>
                </div>
            )}
        </dialog>
        <footer className="bid_page_footer" />
        </div>
    );
}

export default Jobspage;