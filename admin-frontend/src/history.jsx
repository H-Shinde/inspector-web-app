import { listBids } from './bidsApi';
import LogoutButton from './LogoutButton';
import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { readHistoryRecords } from './historyRecords';
import HistoryRecordDetails from './Historyrecorddetails';
import navLogo from './bison_logo_nav.png';
import './history.css';
import { FaFilter } from 'react-icons/fa';

DataTable.use(DT);

const fields = [
    ['recordType', 'Type'], ['status', 'Status'], ['previousStatus', 'Previous status'], ['deletedAt', 'Deleted at'], ['appraisalType', 'Appraisal type'],
    ['subjectContactPhone', 'Subject contact phone'], ['date', 'Inspection request date'],
    ['propertyType', 'Type of property'], ['businessName', 'Business name'],
    ['businessAddress', 'Business address'], ['rush', 'Rush'],
    ['name', 'Subject contact name'], ['subjectContactEmail', 'Subject contact email'],
    ['cityStateZip', 'City, State, Zip Code'],
    ['pdf', 'PDF'], ['discount', 'Discount'], ['inspector', 'Assigned inspector'],
];
const summaryFields = ['recordType', 'businessName', 'name', 'date', 'status', 'inspector', 'appraisalType'].map((key) => fields.find(([field]) => field === key));
const columns = summaryFields.map(([data, title]) => ({ data, title, defaultContent: '', render: DT.render.text() }));

export default function History() {
    const [rows, setRows] = useState(() => readHistoryRecords().filter((row) => row.recordType !== 'Bid'));
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setError('');
        listBids(controller.signal, true).then((records) => {
            if (controller.signal.aborted) return;
            const bids = records.filter((row) => ['Declined', 'Deleted'].includes(row.status)).map((row) => ({
                ...row, status: 'Declined', rush: row.rush ? 'Yes' : 'No',
                cityStateZip: [row.city, [row.state, row.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
            }));
            setRows([...readHistoryRecords().filter((row) => row.recordType !== 'Bid'), ...bids]);
        }).catch((error) => { if (!controller.signal.aborted) setError(error.message); });
        return () => controller.abort();
    }, [attempt]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [filterColumn, setFilterColumn] = useState('all');
    const [filterValue, setFilterValue] = useState('');
    const table = useRef(null);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const closeDetails = () => setSelectedRecord(null);
    const openDetails = (event) => {
        const tr = event.target.closest('tbody tr');
        if (!tr) return;
        const record = table.current?.dt().row(tr).data();
        if (record) setSelectedRecord(record);
    };
    const handleFilter = (column, value) => {
        setFilterColumn(column);
        setFilterValue(value);
        const api = table.current?.dt();
        if (!api) return;
        api.columns().search('');
        api.search('');
        if (column === 'all') api.search(value);
        else api.column(Number(column)).search(value);
        api.draw();
    };
    return (
        <div className={`frame_home bid_details_page history_page${selectedRecord ? ' job_details_page' : ''}`}>
                <nav className="nav_bar" aria-label="Main navigation">
                    <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                    <div className="nav_links">
                        <div><a className="nav_bar_text" href="/Homepage">Bids</a></div>
                        <div className="bids_box_selected"><a className="nav_bar_text" href="/History" aria-current="page">History</a></div>
                        {['Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => (
                            <div key={label}><a className="nav_bar_text" href={`/${label}`}>{label}</a></div>
                        ))}
                    </div>
                    <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                        <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
                    </button>
                    {menuOpen && <div className="hamburger_dropdown"><LogoutButton /></div>}
                </nav>
            <main className="history_content" aria-label="Bid history" hidden={!!selectedRecord}>
                <div className="history_page_heading">
                    <h1>History</h1>
                    {error && <p role="alert">{error} <button type="button" className="bid_back_button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
                    <p>Review declined bids and jobs and completed jobs.</p>
                </div>
                <section className="bids_panel history_table_container" aria-label="History table">
                <div className="table_top_header history_filter_controls">
                    <details className="history_filter">
                        <summary className="history_filter_button"><FaFilter aria-hidden="true" /> Filter</summary>
                        <fieldset className="history_filter_menu">
                            <legend>Search in</legend>
                            {[['all', 'All columns'], ...summaryFields.map(([, title], index) => [String(index), title])].map(([value, label]) => (
                                <label key={value}>
                                    <input type="radio" name="history-filter-column" value={value} checked={filterColumn === value}
                                        onChange={() => handleFilter(value, filterValue)} />{label}
                                </label>
                            ))}
                        </fieldset>
                    </details>
                    <input className="history_filter_input" aria-label="Filter history" placeholder="Enter filter text…" value={filterValue}
                        onChange={(event) => handleFilter(filterColumn, event.target.value)} />
                    {filterValue && <button type="button" className="history_filter_button" onClick={() => handleFilter('all', '')}>Clear filter</button>}
                </div>
                <div className="bids_table_container" role="region" aria-label="Scrollable history table" tabIndex={0} onClick={openDetails} onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && event.target.tagName === 'TR') { event.preventDefault(); openDetails(event); }
                }}>
                <DataTable ref={table} data={rows} columns={columns} className="bids_table history_table"
                    options={{
                        createdRow: (row) => { row.tabIndex = 0; row.setAttribute('aria-label', 'View history record details'); },
                        paging: true, searching: true, ordering: true, info: true,
                        scrollX: false, autoWidth: false, pageLength: 10, lengthMenu: [10, 25, 50, 100],
                        order: [[4, 'asc']],
                        layout: { topStart: 'pageLength', topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
                        language: { emptyTable: 'No completed or declined records yet.', search: 'Search:' },
                    }} />
                </div>
                </section>
            </main>
            {selectedRecord && <HistoryRecordDetails key={`${selectedRecord.recordType}-${selectedRecord.id}`} record={selectedRecord} onBack={closeDetails} />}
            <footer className="bid_page_footer" />
        </div>
    );
}