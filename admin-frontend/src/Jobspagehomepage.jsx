import { appraisalTypeLabel } from './appraisalTypes';
import LogoutButton from './LogoutButton';
import { JOB_STATUSES } from './jobStatus';
import { archiveDeletedRecord, isDeletedRecord, completeJob, isCompletedJob } from './historyRecords';
import './Jobspagehomepage.css';
import { readBidList } from './bidFields';
import { readAcceptedJobs } from './bidTransfers';
import { withJobDemoData, seedJobDemoSections } from './jobDemoData';
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

// No inspector means Unassigned; otherwise keep a valid progress status, defaulting to Assigned.
const resolveJobStatus = (status, inspector) => {
    if (!inspector) return 'Unassigned';
    return ['Assigned', 'In-Progress', 'Pending Review'].includes(status) ? status : 'Assigned';
};
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

    const confirmComplete = () => {
        if (!completeTarget) return;
        completeJob(completeTarget);
        window.location.href = '/History';
    };

    const closeConfirm = () => {
        if (confirmDialog.current?.open) confirmDialog.current.close();
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (deleteTarget) handleDelete(deleteTarget.id);
        closeConfirm();
    };

    const handleBidsClick = () => {
        window.location.href= '/Homepage';
    };

    const handleView = (row) => {
        const jobs = tableData.map((job) => ({ ...job, pdf: job.pdf?.name ?? job.pdf ?? '' }));
        sessionStorage.setItem('availableJobs', JSON.stringify(jobs));
        sessionStorage.setItem('selectedJob', JSON.stringify(jobs.find((job) => job.id === row.id)));
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

    const [tableData, setTableData] = useState([
        {
            id: 1,
            name: "John Doe",
            date: "08/10/2006",
            businessName: "Vertex Logistics",
            status: "In-Progress"
        },
        {
            id: 2,
            name: "Saige Fuentes",
            date: "01/12/2016",
            businessName: "Lumina Marketing",
            status: "Assigned"
        },
        {
            id: 3,
            name: "Bowen Higgins",
            date: "02/10/2006",
            businessName: "BlueWave Digital",
            status: "Pending Review"
        },
        {
            id: 4,
            name: "Kylan Gentry",
            date: "03/10/2016",
            businessName: "Apex Financial Group",
            status: "Assigned"
        },
        {
            id: 5,
            name: "Aaron Paul",
            date: "04/10/2017",
            businessName: "Ironclad Security Services",
            status: "Unassigned",
            inspector: ""
        },
        {
            id: 6,
            name: "Sarah Hopkins",
            date: "02/15/2012",
            businessName: "Zenith Healthcare",
            status: "In-Progress"
        },
        {
            id: 7,
            name: "Xavier Pace",
            date: "03/10/2012",
            businessName: "Vanguard Consulting",
            status: "Assigned"
        },
        {
            id: 8,
            name: "Charles Xavier",
            date: "04/12/2026",
            businessName: "Horizon Eco Solutions",
            status: "Pending Review"
        },
        {
            id: 9,
            name: "Maya Bennett",
            date: "05/06/2026",
            businessName: "Cedar Grove Realty",
            status: "Assigned"
        },
        {
            id: 10,
            name: "Ethan Brooks",
            date: "05/14/2026",
            businessName: "Summit Manufacturing",
            status: "Unassigned",
            inspector: ""
        },
        {
            id: 11,
            name: "Olivia Chen",
            date: "06/02/2026",
            businessName: "Harborview Hospitality",
            status: "In-Progress"
        },
        {
            id: 12,
            name: "Noah Carter",
            date: "06/18/2026",
            businessName: "Pinecrest Construction",
            status: "Assigned"
        },
        {
            id: 13,
            name: "Amara Williams",
            date: "07/08/2026",
            businessName: "BrightPath Education",
            status: "Pending Review"
        },
        {
            id: 14,
            name: "Lucas Rivera",
            date: "07/22/2026",
            businessName: "Stonebridge Auto Services",
            status: "Assigned"
        },
        {
            id: 15,
            name: "Karen Patel",
            date: "08/05/2026",
            businessName: "Maple Leaf Retail",
            status: "Unassigned",
            inspector: ""
        },
        {
            id: 16,
            name: "Jackson Reed",
            date: "08/19/2026",
            businessName: "Northstar Warehousing",
            status: "In-Progress"
        },
        {
            id: 17,
            name: "Isabella Morgan",
            date: "09/03/2026",
            businessName: "Willow Creek Wellness",
            status: "Assigned"
        },
        {
            id: 18,
            name: "Elijah Foster",
            date: "09/16/2026",
            businessName: "Clearwater Engineering",
            status: "Pending Review"
        },
        {
            id: 19,
            name: "Ava Thompson",
            date: "10/01/2026",
            businessName: "Oakridge Food Services",
            status: "Assigned"
        },
        {
            id: 20,
            name: "Liam Hayes",
            date: "10/08/2026",
            businessName: "Silverline Technology",
            status: "Unassigned",
            inspector: ""
        }
        ].concat(readAcceptedJobs(), readBidList('createdJobs')).map(withJobDemoData).map((job) => {
            const inspector = readBidList('jobAssignments').find((assignment) => assignment.jobId === job.id)?.inspector ?? job.inspector ?? '';
            return { ...job, inspector, status: resolveJobStatus(job.status, inspector) };
        }).filter((job) => !isDeletedRecord('Job', job.id) && !isCompletedJob(job.id)));


    useEffect(() => {
        seedJobDemoSections(tableData);
        sessionStorage.setItem('availableJobs', JSON.stringify(tableData.map((job) => ({ ...job, pdf: job.pdf?.name ?? job.pdf ?? '' }))));
        sessionStorage.setItem('createdJobs', JSON.stringify(tableData.filter((job) => job.isCreatedJob).map((job) => ({ ...job, pdf: job.pdf?.name ?? job.pdf ?? '' }))));
        sessionStorage.setItem('acceptedJobs', JSON.stringify(tableData.filter((row) => row.sourceBidId !== undefined)));
    }, [tableData]);

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
    const handleDelete = (id) => {
        const record = tableData.find((row) => row.id === id);
        if (!record) return;
        archiveDeletedRecord(record, 'Job');
        window.location.href = '/History';
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
                        <h2 id="confirm-title">Delete this job?</h2>
                        <p>Are you sure you want to delete this job for <strong>{deleteTarget.name}</strong> ({deleteTarget.businessName})?</p>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeConfirm}>Cancel</button>
                        <button type="button" className="bid_form_delete" onClick={confirmDelete}>Delete job</button>
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
                        <h2 id="complete-title">Mark this job complete?</h2>
                        <p>Are you sure you want to mark the job for <strong>{completeTarget.name}</strong> ({completeTarget.businessName}) as complete? It will move to History.</p>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeComplete}>Cancel</button>
                        <button type="button" className="bid_form_save" onClick={confirmComplete}>Complete job</button>
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