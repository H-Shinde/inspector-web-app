import { listJobs, finishJob, deleteJob } from './jobsApi';
import { appraisalTypeLabel } from './appraisalTypes';
import LogoutButton from './LogoutButton';
import { JOB_STATUSES } from './jobStatus';
import './Jobspagehomepage.css';
import navLogo from './bison_logo_nav.png';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-select-dt';
import 'datatables.net-responsive-dt';
import { useEffect, useRef, useState } from 'react';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaTrash, FaCheck } from "react-icons/fa";
import TableFilter from './TableFilter';
import './TableFilter.css';

DataTable.use(DT);

const statusClass = (status) => status.toLowerCase().replace(/\s+/g, '-');

function JobHomepage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [completeTarget, setCompleteTarget] = useState(null);
    const confirmDialog = useRef(null);
    const completeDialog = useRef(null);
    const table = useRef(null);

    useEffect(() => {
        if (deleteTarget && confirmDialog.current && !confirmDialog.current.open) confirmDialog.current.showModal();
    }, [deleteTarget]);

    useEffect(() => {
        if (completeTarget && completeDialog.current && !completeDialog.current.open) completeDialog.current.showModal();
    }, [completeTarget]);

    const closeComplete = () => {
        if (completeDialog.current?.open) completeDialog.current.close();
        setCompleteTarget(null);
    };

    const confirmComplete = async () => {
        if (!completeTarget || busy) return;
        setBusy(true); setError('');
        try { await finishJob(completeTarget); window.location.href = '/History'; }
        catch (error) { setError(error.message); }
        finally { setBusy(false); }
    };

    const closeConfirm = () => {
        if (confirmDialog.current?.open) confirmDialog.current.close();
        setDeleteTarget(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget || busy) return;
        setBusy(true); setError('');
        try { await deleteJob(deleteTarget); closeConfirm(); setAttempt((value) => value + 1); }
        catch (error) { setError(error.message); }
        finally { setBusy(false); }
    };

    const handleBidsClick = () => {
        window.location.href= '/Homepage';
    };

    const handleView = (row) => {
        window.location.href = `/Jobspage?jobId=${encodeURIComponent(row.id)}`;
    };

    // Clicking anywhere on a row (except its buttons) opens that job.
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

    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController(); setLoading(true); setError('');
        listJobs(controller.signal).then((rows) => { if (!controller.signal.aborted) setTableData(rows); })
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
        data: "inspector",
        title: "Assigned Inspector",
        defaultContent: "Unassigned"
    },
    {
        data: "appraisalType",
        title: "Job Type",
        defaultContent: "",
        render: (value) => appraisalTypeLabel(value) || '—'
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
            options: column.data === 'status' ? JOB_STATUSES : undefined,
        }));
  return (
    <div className='frame_home'>
        <dialog ref={confirmDialog} className="popup confirm_popup" aria-labelledby="confirm-title" onCancel={(event) => {
            event.preventDefault();
            closeConfirm();
        }}>
            {deleteTarget && (
                <div>
                    <div className="confirm_body">
                        {error && <p role="alert" className="add_bid_error">{error}</p>}
                        <h2 id="confirm-title">Delete this job?</h2>
                        <p>Are you sure you want to delete this job for <strong>{deleteTarget.name}</strong> ({deleteTarget.businessName})?</p>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeConfirm}>Cancel</button>
                        <button type="button" className="bid_form_delete" disabled={busy} onClick={confirmDelete}>Delete job</button>
                    </div>
                </div>
            )}
        </dialog>

        <dialog ref={completeDialog} className="popup confirm_popup" aria-labelledby="complete-title" onCancel={(event) => {
            event.preventDefault();
            closeComplete();
        }}>
            {completeTarget && (
                <div>
                    <div className="confirm_body">
                        {error && <p role="alert" className="add_bid_error">{error}</p>}
                        <h2 id="complete-title">Mark this job complete?</h2>
                        <p>Are you sure you want to mark the job for <strong>{completeTarget.name}</strong> ({completeTarget.businessName}) as complete? It will move to History.</p>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeComplete}>Cancel</button>
                        <button type="button" className="bid_form_save" disabled={busy} onClick={confirmComplete}>Complete job</button>
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

        <main className="main_content">
            <div className="table_header">
                <div>
                    <h1>Bids &amp; Jobs</h1>
                    <p>Review accepted requests and manage your inspection jobs.</p>
                </div>
            </div>
            <div className='bidsjobsbox'>
                <button type="button" onClick={handleBidsClick} className='jobsbox'>
                    Bids
                </button>
                <div className="bidsbox" aria-current="page">
                    Jobs
                </div>
            </div>
        {loading && <p role="status">Loading jobs…</p>}
        {error && <p role="alert" className="add_bid_error">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reload jobs</button></p>}
        <section className="bids_panel" aria-label="Jobs">
            <div className="table_filter_toolbar">
                <TableFilter tableRef={table} columns={filterColumns} />
            </div>
            <div className="bids_table_container" onClick={handleRowClick} onKeyDown={handleRowKeyDown}>
            <DataTable
            ref={table}
            data={tableData}
            columns={columns}
            className="bids_table"
            slots={{
                4: (data, type, row) => (
                    <span className={`bid_status bid_status_${statusClass(row.status)}`}>{row.status}</span>
                ),
                5: (data, type, row) => <span>{row.inspector || 'Unassigned'}</span>,
                7: (data, type, row) => (
                    <div className="action_buttons">
                        <button type="button" className="job_complete_button" title="Mark Complete" aria-label={`Mark job for ${row.name} complete`}
                            onClick={(event) => { event.stopPropagation(); setCompleteTarget(row); }}><FaCheck aria-hidden="true" /></button>
                        <button
                            className="delete_icon" title="Delete job" aria-label={`Delete job for ${row.name}`}
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

export default JobHomepage;
