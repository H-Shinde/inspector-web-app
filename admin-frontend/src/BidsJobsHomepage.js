import './BidsJobsHomepage.css';
import logo_2 from './bison_logo__login.png';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-select-dt';
import 'datatables.net-responsive-dt';
import { useRef, useState } from 'react';
import 'datatables.net-dt/css/dataTables.dataTables.css';
DataTable.use(DT);
function Homepage() {
    const [filterColumn, setFilterColumn] = useState("all");
    const [filterValue, setFilterValue] = useState("");
    const table = useRef(null);


    
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
  return (
    <div className='frame_home'>
        <div className = 'nav_bar'>
            <img
                className="bison_logo_nav"
              
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
            <div className='burger_icon_position'>
                <div className = 'burger_icon_frame'>
                    <div className = 'top_bun'></div>
                    <div className = 'patty'></div>
                    <div className = 'bottom_bun'></div>
                </div>
            </div>
            
        </div>

        <div className='header'>
            
        </div>
        <main className="main_content">
            <div className='bidsjobsbox'>
                <div className= "bidsbox">
                    Bids
                </div>
                <div className='jobsbox'>
                    Jobs
                </div>
            </div>
        <div className="table_top_header">

            <div className="filter_controls">

                <select
                    className="filter_column"
                    value={filterColumn}
                    onChange={(e) =>
                        handleFilter(e.target.value, filterValue)
                    }
                >
                    <option value="all">All Columns</option>
                    <option value="0">ID</option>
                    <option value="1">Name</option>
                    <option value="2">Date</option>
                    <option value="3">Business Name</option>
                    <option value="4">Status</option>
                </select>

                <input
                    className="filter_input"
                    type="text"
                    placeholder="Filter..."
                    value={filterValue}
                    onChange={(e) =>
                        handleFilter(filterColumn, e.target.value)
                    }
                />

            </div>


            <button className="add_bid_button">
                + Add Bid
            </button>

        </div>
            <DataTable
            ref={table}
            data={tableData}
            columns={columns}
            className="bids_table"
            options={{
                paging: true,
                searching: true,
                ordering: true,
                info: true,
                pageLength: 5
            }}

            />
        </main>
        <div className='footer'></div>

    </div>
  );
}

export default Homepage;
