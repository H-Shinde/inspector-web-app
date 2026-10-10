import './Jobspagehomepage.css';
import navLogo from './bison_logo_nav.png';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-select-dt';
import 'datatables.net-responsive-dt';
import { useEffect, useRef, useState } from 'react';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaTrash } from "react-icons/fa";
import { FaEye } from "react-icons/fa";
import { FaEdit } from "react-icons/fa";
import { FaSave, FaFilter } from "react-icons/fa";

DataTable.use(DT);
function JobHomepage() {
    const [editingId, setEditingId] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState({});
    const dialog = useRef(null);

    useEffect(() => {
        if (isOpen) dialog.current.showModal();
    }, [isOpen]);

    const closeEditor = () => {
        dialog.current.close();
        setIsOpen(false);
        setEditingId(null);
        setDraft({});
    };

    const openEditor = (row) => {
        const [month, day, year] = row.date.split('/');
        setDraft({ ...row, inspectionRequestDate: `${year}-${month}-${day}` });
        setEditingId(row.id);
        setIsOpen(true);
    };

    function handleSubmit(event) {
        event.preventDefault();
        const [year, month, day] = draft.inspectionRequestDate.split('-');
        setTableData((rows) => rows.map((row) => row.id === editingId
            ? { ...row, ...draft, date: `${month}/${day}/${year}` }
            : row));
        closeEditor();
    }

    const handleBidsClick = () => {
        window.location.href= '/Homepage';
    };
    const [filterColumn, setFilterColumn] = useState("all");
    const [filterValue, setFilterValue] = useState("");
    const table = useRef(null);


    
    const [tableData, setTableData] = useState([
        {
            id: 1,
            name: "John Doe",
            date: "08/10/2006",
            businessName: "Vertex Logistics",
            status: "Accepted"
        },
        {
            id: 2,
            name: "Saige Fuentes",
            date: "01/12/2016",
            businessName: "Lumina Marketing",
            status: "Accepted"
        },
        {
            id: 3,
            name: "Bowen Higgins",
            date: "02/10/2006",
            businessName: "BlueWave Digital",
            status: "Accepted"
        },
        {
            id: 4,
            name: "Kylan Gentry",
            date: "03/10/2016",
            businessName: "Apex Financial Group",
            status: "Accepted"
        },
        {
            id: 5,
            name: "Aaron Paul",
            date: "04/10/2017",
            businessName: "Ironclad Security Services",
            status: "Accepted"
        },
        {
            id: 6,
            name: "Sarah Hopkins",
            date: "02/15/2012",
            businessName: "Zenith Healthcare",
            status: "Accepted"
        },
        {
            id: 7,
            name: "Xavier Pace",
            date: "03/10/2012",
            businessName: "Vanguard Consulting",
            status: "Accepted"
        },
        {
            id: 8,
            name: "Charles Xavier",
            date: "04/12/2026",
            businessName: "Horizon Eco Solutions",
            status: "Accepted"
        },
        {
            id: 9,
            name: "Maya Bennett",
            date: "05/06/2026",
            businessName: "Cedar Grove Realty",
            status: "Accepted"
        },
        {
            id: 10,
            name: "Ethan Brooks",
            date: "05/14/2026",
            businessName: "Summit Manufacturing",
            status: "Accepted"
        },
        {
            id: 11,
            name: "Olivia Chen",
            date: "06/02/2026",
            businessName: "Harborview Hospitality",
            status: "Accepted"
        },
        {
            id: 12,
            name: "Noah Carter",
            date: "06/18/2026",
            businessName: "Pinecrest Construction",
            status: "Accepted"
        },
        {
            id: 13,
            name: "Amara Williams",
            date: "07/08/2026",
            businessName: "BrightPath Education",
            status: "Accepted"
        },
        {
            id: 14,
            name: "Lucas Rivera",
            date: "07/22/2026",
            businessName: "Stonebridge Auto Services",
            status: "Accepted"
        },
        {
            id: 15,
            name: "Sophia Patel",
            date: "08/05/2026",
            businessName: "Maple Leaf Retail",
            status: "Accepted"
        },
        {
            id: 16,
            name: "Jackson Reed",
            date: "08/19/2026",
            businessName: "Northstar Warehousing",
            status: "Accepted"
        },
        {
            id: 17,
            name: "Isabella Morgan",
            date: "09/03/2026",
            businessName: "Willow Creek Wellness",
            status: "Accepted"
        },
        {
            id: 18,
            name: "Elijah Foster",
            date: "09/16/2026",
            businessName: "Clearwater Engineering",
            status: "Accepted"
        },
        {
            id: 19,
            name: "Ava Thompson",
            date: "10/01/2026",
            businessName: "Oakridge Food Services",
            status: "Accepted"
        },
        {
            id: 20,
            name: "Liam Hayes",
            date: "10/08/2026",
            businessName: "Silverline Technology",
            status: "Accepted"
        }
        ]);


    const columns = [
    {
        data: "id",
        title: "# ID"
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
    const handleFilter = (column, value) => {
        setFilterColumn(column);
        setFilterValue(value);
        if (!table.current) return;

        const api = table.current.dt();

        // Clear previous column filters
        api.columns().search("");

        if (column === "all") {
            // Search entire table
            api.search(value).draw();
        } else {
            // Clear global search
            api.search("");

            // Search selected column
            api.column(Number(column)).search(value).draw();
        }
    };    
    const handleDelete = (id) => {
    setTableData((prevData) =>
        prevData.filter((row) => row.id !== id)
    );
    };
    const handleEditChange = (field, value) => {
        setDraft((previous) => ({ ...previous, [field]: value }));
    };
    const formSections = [
        { title: 'Inspection details', fields: [
            ['appraisalType', 'Appraisal type'],
            ['inspectionRequestDate', 'Inspection request date', 'date'],
            ['propertyType', 'Type of property'],
            ['status', 'Status', 'select'],
        ] },
        { title: 'Subject contact', fields: [
            ['name', 'Subject contact name'],
            ['subjectContactPhone', 'Subject contact phone', 'tel'],
            ['subjectContactEmail', 'Subject contact email', 'email'],
        ] },
        { title: 'Business & property address', fields: [
            ['businessName', 'Business name'],
            ['businessAddress', 'Business address'],
            ['city', 'City'],
            ['state', 'State'],
            ['zipCode', 'ZIP code'],
        ] },
    ];
  return (
    <div className='frame_home'>
        <dialog ref={dialog} className="popup" aria-labelledby="form-title" onCancel={(event) => {
            event.preventDefault();
            closeEditor();
        }}>
            {isOpen && (
                <form onSubmit={handleSubmit}>
                    <div className="bid_form_header">
                        <div>
                            <p className="bid_form_eyebrow">{draft.name || 'Unnamed contact'}</p>
                            <h2 id="form-title">Edit job details</h2>
                            <p>Update the details below, then save your changes.</p>
                        </div>
                        <button type="button" className="bid_form_close" aria-label="Close editor" onClick={closeEditor}>×</button>
                    </div>
                    <div className="bid_form_body">
                        {formSections.map((section) => (
                            <fieldset className="bid_form_section" key={section.title}>
                                <legend>{section.title}</legend>
                                <div className="bid_form_grid">
                                    {section.fields.map(([field, label, type = 'text']) => (
                                        <div className="bid_form_field" key={field}>
                                            <label htmlFor={`bid-${field}`}>{label}</label>
                                            {type === 'select' ? (
                                                <select id={`bid-${field}`} value={draft[field] || 'Pending'} onChange={(event) => handleEditChange(field, event.target.value)}>
                                                    <option>Pending</option>
                                                    <option>Accepted</option>
                                                    <option>Declined</option>
                                                </select>
                                            ) : (
                                                <input id={`bid-${field}`} type={type} value={draft[field] || ''} required={field === 'name' || field === 'inspectionRequestDate'} onChange={(event) => handleEditChange(field, event.target.value)} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                        <fieldset className="bid_form_section">
                            <legend>Additional details</legend>
                            <div className="bid_form_grid">
                                <div className="bid_form_field">
                                    <label htmlFor="bid-discount">Discount</label>
                                    <input id="bid-discount" type="number" min="0" step="0.01" value={draft.discount ?? ''} onChange={(event) => handleEditChange('discount', event.target.value)} />
                                </div>
                                <label className="bid_form_checkbox">
                                    <input type="checkbox" checked={Boolean(draft.rush)} onChange={(event) => handleEditChange('rush', event.target.checked)} />
                                    Rush inspection
                                </label>
                                <div className="bid_form_field bid_form_full">
                                    <label htmlFor="bid-pdf">PDF attachment</label>
                                    <input id="bid-pdf" type="file" accept=".pdf,application/pdf" onChange={(event) => handleEditChange('pdf', event.target.files[0] || draft.pdf)} />
                                    {draft.pdf && <span className="bid_form_hint">Selected: {draft.pdf.name}</span>}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeEditor}>Cancel</button>
                        <button type="submit" className="bid_form_save"><FaSave /> Save</button>
                    </div>
                </form>
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
        <div className="table_top_header">

            <div className="filter_controls">

                <details className="bid_filter">
                    <summary className="filter_button"><FaFilter aria-hidden="true" /> Filter</summary>
                    <fieldset className="filter_menu">
                        <legend>Search in</legend>
                        {[
                            ['all', 'All columns'], ['0', 'ID'], ['1', 'Name'],
                            ['2', 'Date'], ['3', 'Business name'], ['4', 'Status'],
                        ].map(([value, label]) => (
                            <label key={value}>
                                <input type="radio" name="job-filter-column" value={value}
                                    checked={filterColumn === value}
                                    onChange={() => handleFilter(value, filterValue)} />
                                {label}
                            </label>
                        ))}
                    </fieldset>
                </details>

                <input
                    className="filter_input" aria-label="Filter jobs"
                    type="text"
                    placeholder="Filter..."
                    value={filterValue}
                    onChange={(e) =>
                        handleFilter(filterColumn, e.target.value)
                    }
                />

            </div>




        </div>
            <div className="bids_table_container">
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

                        <button className="view" title="View job" aria-label={`View job ${row.id}`}>
                            <FaEye />
                        </button>

                        <button className="edit" title="Edit job" aria-label={`Edit job ${row.id}`} onClick={() => openEditor(row)}>
                            <FaEdit />
                        </button>

                        <button
                            className="delete_icon" title="Delete job" aria-label={`Delete job ${row.id}`}
                            onClick={() => handleDelete(row.id)}
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
                pageLength: 10
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
