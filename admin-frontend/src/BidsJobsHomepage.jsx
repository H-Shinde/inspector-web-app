import LogoutButton from './LogoutButton';
import { listBids, deleteBid } from './bidsApi';
import './BidsJobsHomepage.css';
import navLogo from './bison_logo_nav.png';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-select-dt';
import 'datatables.net-responsive-dt';
import { useEffect, useRef, useState } from 'react';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaTrash } from "react-icons/fa";
import TableFilter from './Tablefilter';
import './TableFilter.css';

DataTable.use(DT);
function Homepage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const confirmDialog = useRef(null);
    const table = useRef(null);

    useEffect(() => {
        if (deleteTarget && confirmDialog.current && !confirmDialog.current.open) confirmDialog.current.showModal();
    }, [deleteTarget]);

    const closeConfirm = () => {
        if (confirmDialog.current?.open) confirmDialog.current.close();
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (deleteTarget) handleDelete(deleteTarget.id);
        closeConfirm();
    };

    const handleView = (row) => {
        window.location.href = `/Bidspage?bidId=${encodeURIComponent(row.id)}`;
    };

    // Clicking anywhere on a row (except its buttons) opens that bid.
    const handleRowClick = (event) => {
        if (event.target.closest('button, a, input, select')) return;
        const tr = event.target.closest('tbody tr');
        if (!tr || !table.current) return;
        const row = table.current.dt().row(tr).data();
        if (row) handleView(row);
    };

    const handleRowKeyDown = (event) => {
        if (event.key === 'Enter' && event.target.tagName === 'TR') handleRowClick(event);
    };

    const handleJobsClick = () => {
        window.location.href= '/JobHomepage';
    };



    
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        listBids(controller.signal).then((rows) => { if (!controller.signal.aborted) setTableData(rows); })
            .catch((error) => { if (!controller.signal.aborted) setError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [attempt]);

    const columns = [
    {
        data: "id",
        title: "ID",
        visible: false,
        searchable: false
    },
    {
        data: "name",
        title: "Name"
    },
    {
        data: "date",
        title: "Date"
    },
    {
        data: "businessName",
        title: "Business Name"
    },
    {
        data: "status",
        title: "Status"
    },
    {
        data: null,
        title: "Actions",
        orderable: false,
        searchable: false
    }
   
    ];
    // One filter per data column (the Actions column is skipped).
    const filterColumns = columns
        .map((column, index) => ({ column, index }))
        .filter(({ column }) => column.data && column.visible !== false)
        .map(({ column, index }) => ({
            index,
            label: column.title.replace('# ', ''),
            options: column.data === 'status' ? [...new Set(tableData.map((row) => row.status))] : undefined,
        }));
    const handleDelete = async (id) => {
        const record = tableData.find((row) => row.id === id);
        if (!record) return;
        try { await deleteBid(id); window.location.href = '/History'; }
        catch (error) { setError(error.message); }
    };
  return (
    <div className='frame_home'>
        <dialog ref={confirmDialog} className="popup confirm_popup" aria-labelledby="confirm-title" onCancel={(event) => {
            event.preventDefault();
            closeConfirm();
        }}>
            {deleteTarget && (
                <div>
                    <div className="confirm_body">
                        <h2 id="confirm-title">Delete this bid?</h2>
                        <p>Are you sure you want to delete this bid for <strong>{deleteTarget.name}</strong> ({deleteTarget.businessName})?</p>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeConfirm}>Cancel</button>
                        <button type="button" className="bid_form_delete" onClick={confirmDelete}>Delete bid</button>
                    </div>
                </div>
            )}
        </dialog>

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
                <div className="settings_box"><a className="nav_bar_text" href="/Settings">Settings</a></div>
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
                    <LogoutButton />
                </div>
            )}
            
        </div>

        <main className="main_content">
            <div className="table_header">
                <div>
                    <h1>Bids &amp; Jobs</h1>
                    <p>Review inspection requests and manage your bids.</p>
                </div>
            </div>
            <div className='bidsjobsbox'>
                <div className= "bidsbox">
                    Bids
                </div>
                <button type="button" onClick={handleJobsClick} className='jobsbox'>
                    Jobs
                </button>
            </div>
        {loading && <p role="status">Loading bids…</p>}
        {error && <p role="alert" className="add_bid_error">{error} <button type="button" className="bid_back_button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
        <section className="bids_panel" aria-label="Bids">
        <div className="table_top_header">
            <TableFilter tableRef={table} columns={filterColumns} />
            <button className="add_bid_button" onClick={() => { window.location.href = '/AddBid?from=Homepage'; }}>
                + Add Bid
            </button>
        </div>
            <div className="bids_table_container" onClick={handleRowClick} onKeyDown={handleRowKeyDown}>
            <DataTable
            ref={table}
            data={tableData}
            columns={columns}
            className="bids_table"
            slots={{
                4: (data, type, row) => (
                    <span className={`bid_status bid_status_${row.status.toLowerCase()}`}>{row.status}</span>
                ),
                5: (data, type, row) => (
                    <div className="action_buttons">
                        <button
                            className="delete_icon" title="Delete bid" aria-label={`Delete bid for ${row.name}`}
                            onClick={(event) => { event.stopPropagation(); setDeleteTarget(row); }}
                        >
                            <FaTrash />
                        </button>
                    </div>
                )
            }}
            options={{
                paging: true,
                searching: true,
                ordering: true,
                info: true,
                pageLength: 10,
                createdRow: (row) => { row.tabIndex = 0; }
            }}

            />
            </div>
        </section>
        </main>

        <div className='footer'></div>

    </div>
  );
}

export default Homepage;