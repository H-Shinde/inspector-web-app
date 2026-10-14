import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import navLogo from './bison_logo_nav.png';
import './reports.css';

// Counts and categories from BarLineChart.svg, independent of the sample report table.
const chartData = [
    [400, 0, 1], [500, 0, 1], [1200, 3, 1], [1300, 17, 2],
    [1400, 9, 2], [1500, 14, 0], [1600, 10, 1], [1700, 1, 0],
    [1800, 0, 1], [2000, 0, 1],
].map(([category, valuationFalse, valuationTrue]) => ({
    category, valuationFalse, valuationTrue,
}));

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
            <figure className="reports_chart" aria-label="Business valuation counts by category, False and True">
                <div className="reports_chart_plot">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 22, right: 17, bottom: 16, left: 0 }}
                            barCategoryGap="10%" barGap={2} accessibilityLayer>
                            <CartesianGrid stroke="#00001A" strokeOpacity={0.15} strokeDasharray="2 2" />
                            <XAxis dataKey="category" type="category" interval={0} tickLine={false}
                                axisLine={{ stroke: '#00001A', strokeOpacity: 0.3 }}
                                tick={{ fill: 'rgba(0, 0, 0, 0.7)', fontSize: 12 }} height={30} tickMargin={10} />
                            <YAxis domain={[0, 20]} ticks={[0, 4, 8, 12, 16, 20]} width={40}
                                tickLine={false} axisLine={false}
                                tick={{ fill: 'rgba(0, 0, 0, 0.7)', fontSize: 12 }} />
                            <Tooltip cursor={{ fill: '#EBF0F5', fillOpacity: 0.5 }} />
                            <Legend iconType="square" iconSize={11} wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                formatter={(value) => <span className="reports_chart_legend_label">{value}</span>} />
                            <Bar dataKey="valuationFalse" name="Business Valuation - False" fill="#4E79A7"
                                fillOpacity={0.8} maxBarSize={36} isAnimationActive={false} />
                            <Bar dataKey="valuationTrue" name="Business Valuation - True" fill="#F28E2C"
                                fillOpacity={0.8} maxBarSize={36} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </figure>
        </main>
        <footer className="bid_page_footer" />
    </div>;
}
