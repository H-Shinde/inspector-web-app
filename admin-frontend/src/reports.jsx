import { useRef, useState } from 'react';
import { FaFilter } from 'react-icons/fa';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import navLogo from './bison_logo_nav.png';
import { reportRows, reportTotals, totalFields } from './reportData';
import './reports.css';

DataTable.use(DT);
const columns = [
    { data: 'id', title: '# ID' },
    { data: 'clientCount', title: 'Count of Client' },
    { data: 'valuationFalse', title: 'Business Valuation (False)' },
    { data: 'valuationTrue', title: 'Business Valuation (True)' },
    { data: 'valuationTotal', title: 'Business Valuation (total)' },
    { data: 'grandTotal', title: 'Grand total' },
];
export default function Reports() {
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
    return <div className="frame_home bid_details_page reports_page">
            <nav className="nav_bar" aria-label="Main navigation">
                <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                <div className="nav_links">
                    {['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => (
                        <div key={label} className={label === 'Reports' ? 'bids_box_selected' : ''}>
                            <a className="nav_bar_text" href={label === 'Bids' ? '/Homepage' : `/${label}`} aria-current={label === 'Reports' ? 'page' : undefined}>{label}</a>
                        </div>
                    ))}
                </div>
                <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                    <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
                </button>
                {menuOpen && <div className="hamburger_dropdown"><a className="logout_button" href="/">Logout</a></div>}
            </nav>
        <main className="main_content">
            <header className="table_header"><div><h1>Reports</h1><p>Client counts and business valuation totals.</p></div></header>
            <section className="bids_panel" aria-label="Business valuation report">
                <div className="table_top_header">
                    <div className="filter_controls">
                        <details className="bid_filter">
                            <summary className="filter_button"><FaFilter aria-hidden="true" /> Filter</summary>
                            <fieldset className="filter_menu">
                                <legend>Search in</legend>
                                {[['all', 'All columns'], ...columns.map((column, index) => [String(index), column.title])].map(([value, label]) => (
                                    <label key={value}>
                                        <input type="radio" name="report-filter-column" value={value} checked={filterColumn === value}
                                            onChange={() => handleFilter(value, filterValue)} />{label}
                                    </label>
                                ))}
                            </fieldset>
                        </details>
                        <input className="filter_input" aria-label="Filter reports" placeholder="Filter..." value={filterValue}
                            onChange={(event) => handleFilter(filterColumn, event.target.value)} />
                        {filterValue && <button type="button" className="filter_button" onClick={() => handleFilter('all', '')}>Clear</button>}
                    </div>
                </div>
                <div className="bids_table_container">
                    <DataTable ref={table} data={reportRows} columns={columns} className="bids_table reports_table"
                        options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                            layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' },
                            footerCallback: function () {
                                const api = this.api();
                                const totals = reportTotals(api.rows({ search: 'applied' }).data().toArray());
                                totalFields.forEach((field, index) => {
                                    api.column(index + 1).footer().textContent = String(totals[field]);
                                });
                            },
                        }}>
                        <tfoot><tr><th scope="row">Grand total</th>{totalFields.map((field) => <th key={field}>{reportTotals(reportRows)[field]}</th>)}</tr></tfoot>
                    </DataTable>
                </div>
                <div className="reports_bottom_actions">
                    <button type="button" className="reports_next_button"
                        onClick={() => { window.location.href = '/ReportsNext'; }}>Next →</button>
                </div>
            </section>
        </main>
        <footer className="bid_page_footer" />
    </div>;
}
