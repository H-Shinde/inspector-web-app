import { useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { readBidList } from './bidFields';
import navLogo from './bison_logo_nav.png';
import './history.css';
import { FaFilter } from 'react-icons/fa';

DataTable.use(DT);

const demoInspectors = ['Alex Morgan', 'Jordan Lee', 'Taylor Brooks', 'Casey Rivera', 'Morgan Ellis', 'Jamie Parker'];

const fields = [
    ['id', 'Bid ID'], ['appraisalType', 'Appraisal type'],
    ['subjectContactPhone', 'Subject contact phone'], ['date', 'Inspection request date'],
    ['propertyType', 'Type of property'], ['businessName', 'Business name'],
    ['businessAddress', 'Business address'], ['rush', 'Rush'],
    ['name', 'Subject contact name'], ['subjectContactEmail', 'Subject contact email'],
    ['cityStateZip', 'City, State, Zip Code'],
    ['pdf', 'PDF'], ['discount', 'Discount'], ['inspector', 'Assigned inspector'],
];
const columns = fields.map(([data, title]) => ({
    data, title, defaultContent: '', render: DT.render.text(),
    ...(['id', 'discount'].includes(data) ? { width: '3%' } : data === 'rush' ? { width: '4%' } : {}),
}));

function readHistory() {
    const records = new Map();
    const assignments = readBidList('jobAssignments');
    for (const bid of [...readBidList('createdBids'), ...readBidList('availableBids')]) {
        records.set(String(bid.id), bid);
    }
    for (const job of [...readBidList('acceptedJobs'), ...readBidList('availableJobs')]) {
        if (job.sourceBidId == null) continue;
        records.set(String(job.sourceBidId), {
            ...job, id: job.sourceBidId,
            inspector: assignments.find((entry) => String(entry.jobId) === String(job.id))?.inspector ?? job.inspector,
        });
    }
    return [...records.values()].map((bid) => ({
        ...bid,
        cityStateZip: [bid.city, [bid.state, bid.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        rush: typeof bid.rush === 'boolean' ? (bid.rush ? 'Yes' : 'No') : bid.rush,
        pdf: bid.pdf?.name ?? bid.pdf ?? '',
        inspector: bid.inspector || bid.assignedInspector || demoInspectors[Math.abs(Number(bid.id) || 0) % demoInspectors.length],
    }));
}

export default function History() {
    const [rows] = useState(readHistory);
    const [menuOpen, setMenuOpen] = useState(false);
    const [filterColumn, setFilterColumn] = useState('all');
    const [filterValue, setFilterValue] = useState('');
    const table = useRef(null);
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
        <div className="frame_home bid_details_page history_page">
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
                    {menuOpen && <div className="hamburger_dropdown"><a className="logout_button" href="/">Logout</a></div>}
                </nav>
            <main className="history_content" aria-label="Bid history">
                <div className="history_page_heading">
                    <h1>History</h1>
                    <p>Review past bids and inspector assignments.</p>
                </div>
                <section className="history_table_container" aria-label="History table">
                <div className="history_filter_controls">
                    <details className="history_filter">
                        <summary className="history_filter_button"><FaFilter aria-hidden="true" /> Filter</summary>
                        <fieldset className="history_filter_menu">
                            <legend>Search in</legend>
                            {[['all', 'All columns'], ...fields.map(([, title], index) => [String(index), title])].map(([value, label]) => (
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
                <DataTable ref={table} data={rows} columns={columns} className="history_table"
                    options={{
                        paging: true, searching: true, ordering: true, info: true,
                        scrollX: false, autoWidth: false, pageLength: 10, lengthMenu: [10, 25, 50, 100],
                        order: [[0, 'desc']],
                        layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' },
                        language: { emptyTable: 'No bid history is available yet.', search: 'Search:' },
                    }} />
                </section>
            </main>
            <footer className="bid_page_footer" />
        </div>
    );
}
