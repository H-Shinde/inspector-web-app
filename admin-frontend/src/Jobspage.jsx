import { getJob, listJobs, updateJob } from './jobsApi';
import useInspectorDirectory from './useInspectorDirectory';
import { validateInput } from './fieldValidation';
import ValidatedForm from './ValidatedForm';
import { appraisalTypeLabel } from './appraisalTypes';
import LogoutButton from './LogoutButton';
import ItemImage from './ItemImage';
import SendJobToInspector from './SendJobToInspector';
import { useEffect, useRef, useState } from 'react';
import './Jobspage.css';
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

const jobInformationFields = [
    ['sourceBidReference', 'Source bid'],
    ['status', 'Job status'],
    ['clientCompany', 'Client company'],
    ['clientName', 'Client name'],
    ['clientStreetAddress', 'Client street address'],
    ['clientCity', 'Client city'],
    ['clientState', 'Client state'],
    ['clientZipCode', 'Client ZIP code'],
    ['clientPhone', 'Client phone'],
    ['clientEmail', 'Client email'],
    ['appraisalType', 'Appraisal type'],
    ['reportFormat', 'Report format'],
    ['businessName', 'Business name'],
    ['propertyType', 'Type of property'],
    ['businessAddress', 'Business address'],
    ['city', 'Business city'],
    ['state', 'Business state'],
    ['zipCode', 'Business ZIP code'],
    ['name', 'Subject contact name'],
    ['subjectContactEmail', 'Subject contact email'],
    ['subjectContactPhone', 'Subject contact phone'],
    ['valueType', 'Value type'],
    ['valueDate', 'Value date'],
    ['intendedUse', 'Intended use'],
    ['intendedUser', 'Intended user'],
    ['completionDays', 'Completion days'],
    ['date', 'Inspection request date'],
    ['rush', 'Rush'],
    ['pdfOnly', 'PDF only / No hard copy'],
    ['bidAmount', 'Appraisal fee'],
    ['discount', 'Discount'],
    ['rushDiscount', 'Rush discount'],
    ['additionalCharges', 'Additional charges'],
    ['totalBid', 'Total bid'],
];

const sectionGroups = {
    'Item Appraisal': ['Appraised Items', 'Non Appraised Items'],
    'Valuation & Fees': ['Asset Valuation', 'Inspection Fees'],
};
const sections = ['Job Information', ...Object.keys(sectionGroups), 'Items', 'Assign Inspector'];
const yesNoFields = new Set(['rush', 'pdfOnly', 'fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue']);
const isSelected = (value) => value === true || value === 'true' || (Number.isFinite(Number(value)) && Number(value) > 0);

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
    const [itemSaveError, setItemSaveError] = useState('');
    const [savingItem, setSavingItem] = useState(false);
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
    const closeItem = async () => {
        if (savingItem) return;
        if (itemEditor?.mode === 'edit') {
            for (const input of itemDialog.current.querySelectorAll('input')) validateInput(input);
            if (!itemDialog.current.querySelector('form').reportValidity()) return;
            setSavingItem(true);
            try { await persistItems(items.map((item) => item.itemId === itemEditor.item.itemId ? itemEditor.item : item)); }
            catch (error) { setItemSaveError(error.message); setSavingItem(false); return; }
            setSavingItem(false);
        }
        itemDialog.current.close(); setItemEditor(null); setItemSaveError('');
    };
    const [activeSection, setActiveSection] = useState('Job Information');
    const [editingSection, setEditingSection] = useState(null);
    const [details, setDetails] = useState({});
    const [jobs, setJobs] = useState([]);
    const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('jobId') || '');
    const [loading, setLoading] = useState(true);
    const [jobError, setJobError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [saveCount, setSaveCount] = useState(0);
    const currentJob = useRef(null);
    const saveQueue = useRef(Promise.resolve());
    useEffect(() => {
        const controller = new AbortController(); setLoading(true); setJobError('');
        const request = selectedId ? getJob(selectedId, controller.signal) : listJobs(controller.signal).then((rows) => rows[0] || null);
        request.then((record) => {
            if (controller.signal.aborted) return;
            currentJob.current = record;
            setJobs(record ? [record] : []);
            if (record) { setDetails({ [record.id]: record.sectionDetails || {} }); if (!selectedId) setSelectedId(String(record.id)); }
        }).catch((error) => { if (!controller.signal.aborted) setJobError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [selectedId, attempt]);
    const job = jobs.find((item) => String(item.id) === selectedId);
    const archived = ['Complete', 'Deleted'].includes(job?.status);
    const saveJob = (changes) => {
        setSaveCount((value) => value + 1); setJobError('');
        const result = saveQueue.current.catch(() => {}).then(async () => {
            const latest = currentJob.current;
            if (!latest) throw new Error('Load a job before saving.');
            const updated = await updateJob(latest.id, { ...changes, revision: latest.revision });
            currentJob.current = updated; setJobs([updated]); return updated;
        });
        saveQueue.current = result;
        return result.catch((error) => { setJobError(error.message); throw error; }).finally(() => setSaveCount((value) => value - 1));
    };
    const updateField = (sectionName, field, value) => {
        setDetails((previous) => ({ ...previous, [selectedId]: { ...previous[selectedId], [sectionName]: { ...previous[selectedId]?.[sectionName], [field]: value } } }));
        void saveJob({ sectionDetails: { [sectionName]: { [field]: value } } }).catch(() => {});
    };
    const locationZip = job?.clientZipCode || job?.zipCode || '';
    const referenceZip = /^\d{5}(?:-\d{4})?$/.test(locationZip) ? locationZip : '';
    const { inspectors: inspectorList } = useInspectorDirectory(false, referenceZip);
    const [pendingInspector, setPendingInspector] = useState('');
    useEffect(() => { setPendingInspector(job?.inspectorId ? String(job.inspectorId) : ''); }, [job?.inspectorId]);
    const [sendRequest, setSendRequest] = useState(0);
    const sortedInspectors = job ? referenceZip ? inspectorList.map((inspector) => ({ inspector, distance: inspector.distanceMiles ?? null })) : sortInspectorsByDistance(inspectorList, job) : [];
    const jobLocation = job ? [job.city, job.state].filter(Boolean).join(', ') : '';
    const items = (Array.isArray(job?.items) ? job.items : []).map((item, index) => ({ ...item, itemId: item.itemId ?? `${job.id}-${index}` }));
    const persistItems = (updatedItems) => saveJob({ items: updatedItems });
    const editItemField = (field, value) => setItemEditor((previous) => ({ ...previous, item: { ...previous.item, [field]: value } }));
    const addItem = async (event) => {
        event.preventDefault();
        if (itemEditor.mode !== 'add' || savingItem) return;
        const name = itemEditor.item.name?.trim();
        if (!name) return;
        setItemSaveError('');
        const itemId = crypto.randomUUID();
        setSavingItem(true);
        try {
            await persistItems([...items, { ...itemEditor.item, name, itemId }]);
            setViewedItemId(null);
            itemDialog.current.close(); setItemEditor(null); setItemSaveError('');
            setItemAdded(true);
        } catch {
            setItemSaveError('Unable to save the item. Please try again.');
        } finally { setSavingItem(false); }
    };
    const importCsv = (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const { items: imported, skipped, ignoredColumns } = csvToItems(String(reader.result));
                if (!imported.length) throw new Error('No items were found in the CSV. Each row needs a name.');
                await persistItems([...items, ...imported.map((item) => ({ ...item, itemId: crypto.randomUUID() }))]);
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
    const assignInspector = async () => {
        if (!job || saveCount) return;
        try {
            const updated = await saveJob({ inspectorId: pendingInspector ? Number(pendingInspector) : null });
            if (updated.inspector) setSendRequest((count) => count + 1);
        } catch { /* Error is shown by saveJob. */ }
    };
    const completeCurrentJob = async () => {
        if (saveCount) return;
        try { await saveJob({ status: 'Complete' }); window.location.href = '/History'; }
        catch { /* Error is shown by saveJob. */ }
    };
    const displayValue = (field) => {
        const value = job?.[field];
        if (yesNoFields.has(field)) return isSelected(value) ? 'Yes' : 'No';
        if (value === undefined || value === null || value === '') return 'Not provided';
        if (field === 'appraisalType') return appraisalTypeLabel(value);
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
                    <a className="dropdown_link" href="/Settings">Settings</a>
                    <LogoutButton />
                </div>
            )}
        </div>
        {loading && <p role="status">Loading job…</p>}
        {saveCount > 0 && <p role="status">Saving job…</p>}
        {jobError && <p role="alert" className="add_bid_error">{jobError} <button type="button" disabled={saveCount > 0} onClick={() => setAttempt((value) => value + 1)}>Reload job</button></p>}
        <header className="bid_page_header">
            <div className="bid_details_toolbar">
                <button type="button" className="bid_back_button" onClick={() => { window.location.href = '/JobHomepage'; }}>
                    <span className="bid_back_icon" aria-hidden="true">←</span> Back
                </button>
                <h1 className="bidspage_header">{activeSection}</h1>
                {job && sectionGroups[activeSection] && !archived && (
                    <button
                        type="button"
                        className="bid_add_button"
                        disabled={saveCount > 0}
                        onClick={() => setEditingSection((current) => current === activeSection ? null : activeSection)}
                    >
                        {editingSection === activeSection ? 'Done Editing' : 'Edit'}
                    </button>
                )}

            </div>
        </header>
        <main className="job_details_layout">
            <aside className="job_sidebar" aria-label="Job sections">
                {sections.map((section) => (
                    <button type="button" key={section} className={activeSection === section ? 'active' : ''}
                        aria-current={activeSection === section ? 'page' : undefined}
                        onClick={() => { setActiveSection(section); setEditingSection(null); setViewedItemId(null); }}>{section}</button>
                ))}
            </aside>
            <section className="job_details_content" aria-label={activeSection}>
                {job?.inspector && <SendJobToInspector job={job} sections={details[selectedId]} hideButton openRequest={sendRequest} />}
                {!job ? (
                    <p className="job_empty">Open View from the Jobs table to load job information.</p>
                ) : activeSection === 'Job Information' ? (
                    <div className="fieldsframe">
                        {jobInformationFields.map(([field, label]) => (
                            <div className="bid_detail_field" key={field}>
                                <label htmlFor={`job-${field}`}>{label}</label>
                                <input id={`job-${field}`} type="text" readOnly value={displayValue(field)} />
                            </div>
                        ))}
                    </div>
                ) : sectionGroups[activeSection] ? (
                    <div className="job_section_fields">
                        {sectionGroups[activeSection].map((sectionName) => (
                        <section className="job_combined_group" key={sectionName} aria-label={sectionName}>
                        <h3>{sectionName}</h3>
                            <div>
                                <div className="fieldsframe">
                                    {sectionFields[sectionName].map(([field, label]) => (
                                        <div className="bid_detail_field" key={field}>
                                            <label htmlFor={`section-${sectionName}-${field}`}>{label}</label>
                                            {yesNoFields.has(field) ? (
                                                <select id={`section-${sectionName}-${field}`} disabled={archived || editingSection !== activeSection}
                                                    value={isSelected(details[selectedId]?.[sectionName]?.[field]) ? '1' : '0'}
                                                    onChange={(event) => updateField(sectionName, field, event.target.value)}>
                                                    <option value="1">Yes</option><option value="0">No</option>
                                                </select>
                                            ) : <input id={`section-${sectionName}-${field}`} type={['other', 'meNote'].includes(field) ? 'text' : 'number'}
                                                readOnly={archived || editingSection !== activeSection} min="0" step={['count', 'additionalLocations', 'totalInspectedItems', 'totalNonInspectedItems'].includes(field) ? '1' : '0.01'}
                                                value={details[selectedId]?.[sectionName]?.[field] ?? ''}
                                                onChange={(event) => { if (validateInput(event.target)) { event.target.reportValidity(); return; } updateField(sectionName, field, event.target.value); }} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                        ))}
                    </div>
                ) : activeSection === 'Assign Inspector' ? (
                    <div className="job_assign_inspector">
                        <p className="job_empty">Choose the inspector responsible for {job.name}'s job.</p>
                        <div className="job_assign_field">
                            <label htmlFor="inspector-selector">Assign inspector</label>
                            <select id="inspector-selector" disabled={archived} value={pendingInspector} onChange={(event) => setPendingInspector(event.target.value)}>
                                <option value="">Unassigned</option>
                                {job.inspectorId && !inspectorList.some((entry) => entry.id === job.inspectorId) && <option value={job.inspectorId}>{job.inspector}</option>}
                                {sortedInspectors.map(({ inspector, distance }) => (
                                    <option key={inspector.id ?? inspector.name} value={inspector.id}>
                                        {distance === null ? inspector.name : `${inspector.name} (${distance.toFixed(1)} mi)`}
                                    </option>
                                ))}
                            </select>
                            <p className="job_assign_hint">
                                {jobLocation ? `Sorted by distance from ${jobLocation}. ` : ''}Inspectors with no known location are listed last.
                            </p>
                        </div>
                        <button type="button" className="add_bid_button job_assign_button"
                            disabled={archived || saveCount > 0 || pendingInspector === String(job.inspectorId || '')} onClick={assignInspector}>Assign inspector</button>
                    </div>
                ) : activeSection === 'Items' ? (
                    <div className="job_items_section">
                        <div className="job_items_header">
                            <h2>Items</h2>
                            <div className="job_items_actions">
                                <button type="button" className="add_bid_button" disabled={archived || saveCount > 0} onClick={() => csvInput.current?.click()}>Upload CSV</button>
                                <input ref={csvInput} type="file" accept=".csv,text/csv" hidden aria-label="Upload items CSV" onChange={importCsv} />
                                <button type="button" className="add_bid_button" disabled={archived || saveCount > 0} onClick={() => setItemEditor({ mode: 'add', item: {} })}>+ Add item</button>
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
                                        <button type="button" className="edit" disabled={archived || saveCount > 0} title="Edit item" aria-label={`Edit ${row.name}`} onClick={() => setItemEditor({ mode: 'edit', item: { ...row } })}><FaEdit /></button>
                                        <button type="button" className="delete_icon" disabled={archived || saveCount > 0} title="Delete item" aria-label={`Delete ${row.name}`} onClick={() => { void persistItems(items.filter((item) => item.itemId !== row.itemId)).catch(() => {}); }}><FaTrash /></button>
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
        {job && <div className="job_complete_actions">
            <button type="button" className="bid_add_button" disabled={archived || saveCount > 0} onClick={() => setCompleteConfirmOpen(true)}>Mark Complete</button>
        </div>}
        <dialog ref={itemDialog} className="popup" aria-labelledby="item-dialog-title" onCancel={(event) => { event.preventDefault(); closeItem(); }}>
            {itemEditor && (
                <ValidatedForm onSubmit={addItem}>
                    <div className="bid_form_header">
                        <h2 id="item-dialog-title">{itemEditor.mode === 'add' ? 'Add item' : 'Edit item'}</h2>
                        <button type="button" className="bid_form_close" aria-label="Close item" onClick={closeItem} disabled={savingItem}>×</button>
                    </div>
                    <div className="bid_form_body bid_form_grid">
                        {itemSaveError && <p className="add_bid_error" role="alert">{itemSaveError}</p>}
                        {itemEditor.mode !== 'add' && <ItemImage item={itemEditor.item} />}
                        {[...itemDetailFields, ['type', 'Type']].map(([field, title]) => (
                            <div className="bid_form_field" key={field}>
                                <label htmlFor={`item-${field}`}>{title}</label>
                                <input id={`item-${field}`} type="text" value={itemEditor.item[field] ?? ''}
                                    required={field === 'name'}
                                    disabled={savingItem} readOnly={itemEditor.mode === 'view'} onChange={(event) => editItemField(field, event.target.value)} />
                            </div>
                        ))}
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" disabled={savingItem} onClick={closeItem}>{itemEditor.mode === 'add' ? 'Cancel' : 'Done'}</button>
                        {itemEditor.mode === 'add' && <button type="submit" className="bid_form_save" disabled={!itemEditor.item.name?.trim() || savingItem}>{savingItem ? 'Saving…' : 'Add item'}</button>}
                    </div>
                </ValidatedForm>
            )}
        </dialog>
        <dialog ref={completeDialog} className="popup confirm_popup" aria-labelledby="complete-job-title" onCancel={(event) => { event.preventDefault(); closeCompleteConfirm(); }}>
            {completeConfirmOpen && job && (
                <div>
                    <div className="confirm_body">
                        {jobError && <p role="alert" className="add_bid_error">{jobError}</p>}
                        <h2 id="complete-job-title">Mark this job complete?</h2>
                        <p>Are you sure you want to mark the job for <strong>{job.name}</strong> as complete? It will move to History.</p>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeCompleteConfirm}>Cancel</button>
                        <button type="button" className="bid_form_save" disabled={saveCount > 0} onClick={completeCurrentJob}>Complete job</button>
                    </div>
                </div>
            )}
        </dialog>
        <footer className="bid_page_footer" />
        </div>
    );
}

export default Jobspage;
