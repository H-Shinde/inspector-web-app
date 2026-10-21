import { archiveDeletedRecord, isDeletedRecord } from './historyRecords';
import './BidsJobsHomepage.css';
import { readBidList, readBidEdits } from './bidFields';
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
        const selectedBid = { ...row, pdf: row.pdf?.name ?? row.pdf ?? '' };
        sessionStorage.setItem('availableBids', JSON.stringify(tableData.map((bid) => ({
            ...bid, pdf: bid.pdf?.name ?? bid.pdf ?? '',
        }))));
        sessionStorage.setItem('selectedBid', JSON.stringify(selectedBid));
        window.location.href = `/Bidspage?bidId=${encodeURIComponent(selectedBid.id)}`;
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



    
    const [savedStatuses] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('bidStatuses') || '{}') || {};
        } catch {
            return {};
        }
    });
    const [tableData, setTableData] = useState([
        {
            id: 1,
            name: "John Doe",
            date: "08/10/2006",
            businessName: "Vertex Logistics",
            status: "Pending"
        },
        {
            id: 2,
            name: "Saige Fuentes",
            date: "01/12/2016",
            businessName: "Lumina Marketing",
            status: "Declined"
        },
        {
            id: 3,
            name: "Bowen Higgins",
            date: "02/10/2006",
            businessName: "BlueWave Digital",
            status: "Pending"
        },
        {
            id: 4,
            name: "Kylan Gentry",
            date: "03/10/2016",
            businessName: "Apex Financial Group",
            status: "Declined"
        },
        {
            id: 5,
            name: "Aaron Paul",
            date: "04/10/2017",
            businessName: "Ironclad Security Services",
            status: "Pending"
        },
        {
            id: 6,
            name: "Sarah Hopkins",
            date: "02/15/2012",
            businessName: "Zenith Healthcare",
            status: "Declined"
        },
        {
            id: 7,
            name: "Xavier Pace",
            date: "03/10/2012",
            businessName: "Vanguard Consulting",
            status: "Pending"
        },
        {
            id: 8,
            name: "Charles Xavier",
            date: "04/12/2026",
            businessName: "Horizon Eco Solutions",
            status: "Declined"
        },
        {
            id: 9,
            name: "Maya Bennett",
            date: "05/06/2026",
            businessName: "Cedar Grove Realty",
            status: "Pending"
        },
        {
            id: 10,
            name: "Ethan Brooks",
            date: "05/14/2026",
            businessName: "Summit Manufacturing",
            status: "Declined"
        },
        {
            id: 11,
            name: "Olivia Chen",
            date: "06/02/2026",
            businessName: "Harborview Hospitality",
            status: "Pending"
        },
        {
            id: 12,
            name: "Noah Carter",
            date: "06/18/2026",
            businessName: "Pinecrest Construction",
            status: "Declined"
        },
        {
            id: 13,
            name: "Amara Williams",
            date: "07/08/2026",
            businessName: "BrightPath Education",
            status: "Pending"
        },
        {
            id: 14,
            name: "Lucas Rivera",
            date: "07/22/2026",
            businessName: "Stonebridge Auto Services",
            status: "Declined"
        },
        {
            id: 15,
            name: "Karen Patel",
            date: "08/05/2026",
            businessName: "Maple Leaf Retail",
            status: "Pending"
        },
        {
            id: 16,
            name: "Jackson Reed",
            date: "08/19/2026",
            businessName: "Northstar Warehousing",
            status: "Declined"
        },
        {
            id: 17,
            name: "Isabella Morgan",
            date: "09/03/2026",
            businessName: "Willow Creek Wellness",
            status: "Pending"
        },
        {
            id: 18,
            name: "Elijah Foster",
            date: "09/16/2026",
            businessName: "Clearwater Engineering",
            status: "Declined"
        },
        {
            id: 19,
            name: "Ava Thompson",
            date: "10/01/2026",
            businessName: "Oakridge Food Services",
            status: "Pending"
        },
        {
            id: 20,
            name: "Liam Hayes",
            date: "10/08/2026",
            businessName: "Silverline Technology",
            status: "Declined"
        }
        ].map((row) => ({
            // Fictional details for the demo bids; table columns stay unchanged.
            appraisalType: ['Commercial appraisal', 'Market valuation', 'Property assessment'][(row.id - 1) % 3],
            subjectContactPhone: `202-555-${String(100 + row.id).padStart(4, '0')}`,
            propertyType: ['Office', 'Retail', 'Warehouse', 'Mixed-use'][(row.id - 1) % 4],
            rush: row.id % 3 === 0,
            businessAddress: `${100 + row.id * 10} Example Avenue`,
            pdf: `sample-bid-${row.id}.pdf`,
            discount: String(row.id % 4 * 25),
            subjectContactEmail: `${row.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            city: ['Washington', 'Arlington', 'Alexandria'][(row.id - 1) % 3],
            state: ['DC', 'VA', 'VA'][(row.id - 1) % 3],
            zipCode: ['20001', '22201', '22301'][(row.id - 1) % 3],
            ...row,
            status: savedStatuses[row.id] ?? row.status,
        })).concat(readBidList('createdBids').map((row) => ({ ...row, status: savedStatuses[row.id] ?? row.status }))).map((row) => ({ ...row, ...readBidEdits()[row.id] })).filter((row) => row.status !== 'Accepted' && !isDeletedRecord('Bid', row.id)));


    useEffect(() => {
        const serializable = tableData.map((bid) => ({ ...bid, pdf: bid.pdf?.name ?? bid.pdf ?? '' }));
        sessionStorage.setItem('availableBids', JSON.stringify(serializable));
        sessionStorage.setItem('createdBids', JSON.stringify(serializable.filter((bid) => bid.id > 20)));
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
    const handleDelete = (id) => {
        const record = tableData.find((row) => row.id === id);
        if (!record) return;
        archiveDeletedRecord(record, 'Bid');
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