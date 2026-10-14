import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { FaEnvelope } from 'react-icons/fa';
import navLogo from './bison_logo_nav.png';
import './inspector.css';
import { buildInspectorInviteLink, createInspectorInvite, getInspectors, selectGlobalInspector } from './inspectorSelection';

DataTable.use(DT);

const fields = [['id', '# ID'], ['name', 'Name'], ['distance', 'Distance'], ['company', 'Company'], ['status', 'Status']];
const columns = [
    ...fields.map(([data, title]) => ({ data, title, defaultContent: '', render: data === 'distance'
        ? (value, type) => type === 'display' ? (value === '' || value == null ? 'Not provided' : `${Number(value)} miles`) : value
        : DT.render.text() })),
    { data: null, title: 'Actions', orderable: false, searchable: false },
];
const ACTIONS_COLUMN = fields.length;

function InspectorActions({ row, onMessage }) {
    return <div className="action_buttons">
        <button type="button" title="Message inspector" aria-label={`Message ${row.name}`} onClick={() => onMessage(row)}><FaEnvelope /></button>
    </div>;
}

export default function Inspector() {
    const [rows, setRows] = useState(getInspectors);
    const [menuOpen, setMenuOpen] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [email, setEmail] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [copyMessage, setCopyMessage] = useState('');
    const dialog = useRef(null);
    useEffect(() => { if (inviting && !dialog.current.open) dialog.current.showModal(); }, [inviting]);

    const openInvite = () => { setEmail(''); setInviteLink(''); setCopyMessage(''); setInviting(true); };
    const closeInvite = () => { dialog.current.close(); setInviting(false); };
    const changeEmail = (value) => { setEmail(value); setInviteLink(''); setCopyMessage(''); };

    const copyInviteLink = async (event) => {
        event.preventDefault();
        if (!email.trim()) return;
        const link = buildInspectorInviteLink(createInspectorInvite(email));
        setRows(getInspectors());
        setInviteLink(link);
        try {
            await navigator.clipboard.writeText(link);
            setCopyMessage(`Invite link copied. Send it to ${email.trim()} to open the inspector sign-up page.`);
        } catch {
            setCopyMessage('Could not copy automatically. Select the link above and copy it manually.');
        }
    };

    return (
        <div className="frame_home bid_details_page inspector_page">
            <nav className="nav_bar" aria-label="Main navigation">
                <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                <div className="nav_links">
                    {['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => (
                        <div key={label} className={label === 'Inspector' ? 'bids_box_selected' : ''}>
                            <a className="nav_bar_text" href={label === 'Bids' ? '/Homepage' : `/${label}`} aria-current={label === 'Inspector' ? 'page' : undefined}>{label}</a>
                        </div>
                    ))}
                </div>
                <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                    <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
                </button>
                {menuOpen && <div className="hamburger_dropdown"><a className="logout_button" href="/">Logout</a></div>}
            </nav>
            <main className="main_content">
                <div className="table_header"><div><h1>Inspectors</h1><p>Find inspectors and manage invitations.</p></div></div>
                <section className="bids_panel" aria-label="Inspectors">
                    <div className="table_top_header">
                        <button type="button" className="add_bid_button" onClick={openInvite}>+ Invite Inspector</button>
                    </div>
                    <div className="bids_table_container">
                        <DataTable data={rows} columns={columns} className="bids_table"
                            slots={{ [ACTIONS_COLUMN]: (data, type, row) => <InspectorActions row={row}
                                onMessage={(inspector) => {
                                    selectGlobalInspector(inspector.id);
                                    window.location.href = `/Messaging?inspectorId=${encodeURIComponent(inspector.id)}`;
                                }} /> }}
                            options={{ paging: true, searching: true, ordering: true, info: true, pageLength: 10,
                                layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' },
                                language: { emptyTable: 'No inspectors found.' } }} />
                    </div>
                </section>
            </main>
            <dialog ref={dialog} className="popup" aria-labelledby="inspector-dialog-title" onCancel={(event) => { event.preventDefault(); closeInvite(); }}>
                {inviting && <form onSubmit={copyInviteLink}>
                    <div className="bid_form_header"><h2 id="inspector-dialog-title">Invite Inspector</h2><button type="button" className="bid_form_close" aria-label="Close dialog" onClick={closeInvite}>×</button></div>
                    <div className="bid_form_body">
                        <div className="bid_form_field">
                            <label htmlFor="invite-email">E-mail</label>
                            <input id="invite-email" type="email" required value={email} onChange={(event) => changeEmail(event.target.value)} />
                        </div>
                        {inviteLink && <div className="bid_form_field">
                            <label htmlFor="invite-link">Invite link</label>
                            <input id="invite-link" readOnly value={inviteLink} onFocus={(event) => event.target.select()} />
                        </div>}
                        {copyMessage && <p className="bid_form_hint" role="status">{copyMessage}</p>}
                    </div>
                    <div className="actions">
                        <button type="button" className="bid_form_cancel" onClick={closeInvite}>Close</button>
                        <button type="submit" className="bid_form_save" disabled={!email.trim()}>Copy invite link</button>
                    </div>
                </form>}
            </dialog>
            <footer className="bid_page_footer" />
        </div>
    );
}