import { useState } from 'react';
import navLogo from './bison_logo_nav.png';
import barLineChart from './BarLineChart.svg';
import './reports.css';

export default function ReportsNext() {
    const [menuOpen, setMenuOpen] = useState(false);
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
            <header className="table_header"><div><h1>Reports</h1></div></header>
            <a className="bid_back_button" href="/Reports" style={{ textDecoration: 'none' }}>← Back</a>
            <figure className="reports_chart">
                <img src={barLineChart} alt="Bar and line chart" />
            </figure>
        </main>
        <footer className="bid_page_footer" />
    </div>;
}
