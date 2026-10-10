import { useState } from 'react';
import navLogo from './bison_logo_nav.png';
import './messaging.css';
import { getInspectors, useSelectedInspector } from './inspectorSelection';
import { readBidList } from './bidFields';

export default function Messaging() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [inspectors] = useState(getInspectors);
    const globallySelected = useSelectedInspector();
    const [recipientId, setRecipientId] = useState(() => {
        const requestedId = new URLSearchParams(window.location.search).get('inspectorId');
        return inspectors.find((inspector) => String(inspector.id) === requestedId)?.id
            ?? globallySelected?.id ?? inspectors[0]?.id ?? null;
    });
    const recipient = inspectors.find((inspector) => inspector.id === recipientId);
    const [messages, setMessages] = useState(() => readBidList('inspectorMessages'));
    const [drafts, setDrafts] = useState({});
    const draft = drafts[recipientId] || '';
    const conversation = messages.filter((message) => String(message.inspectorId) === String(recipientId));
    const sendMessage = (event) => {
        event.preventDefault();
        if (!recipient || !draft.trim()) return;
        const sentAt = new Date().toISOString();
        const updated = [...messages, {
            id: crypto.randomUUID(), inspectorId: recipient.id,
            text: draft.trim(), sentAt, sender: 'you',
        }, {
            id: `${crypto.randomUUID()}-reply`, inspectorId: recipient.id,
            text: 'Thanks for your message! I’ll review the details and get back to you shortly.',
            sentAt, sender: 'inspector', demo: true,
        }];
        sessionStorage.setItem('inspectorMessages', JSON.stringify(updated));
        setMessages(updated);
        setDrafts((current) => ({ ...current, [recipientId]: '' }));
    };
    return (
        <div className="frame_home bid_details_page messaging_page">
            <nav className="nav_bar" aria-label="Main navigation">
                <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                <div className="nav_links">
                    {['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => (
                        <div key={label} className={label === 'Messaging' ? 'bids_box_selected' : ''}>
                            <a className="nav_bar_text" href={label === 'Bids' ? '/Homepage' : `/${label}`}
                                aria-current={label === 'Messaging' ? 'page' : undefined}>{label}</a>
                        </div>
                    ))}
                </div>
                <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                    <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
                </button>
                {menuOpen && <div className="hamburger_dropdown"><a className="logout_button" href="/">Logout</a></div>}
            </nav>
            <main className="main_content">
                <header className="table_header"><h1>Messaging</h1></header>
                <div className="messaging_layout">
                    <aside className="messaging_sidebar" aria-label="Inspector recipients">
                        <h2>Inspectors</h2>
                        <div className="messaging_recipients">
                            {inspectors.map((inspector) => (
                                <button type="button" key={inspector.id}
                                    className={recipientId === inspector.id ? 'active' : ''}
                                    aria-pressed={recipientId === inspector.id}
                                    onClick={() => setRecipientId(inspector.id)}>
                                    <span className="messaging_recipient_name">{inspector.name}</span>
                                    <span className="messaging_recipient_company">{inspector.company || inspector.email}</span>
                                </button>
                            ))}
                            {!inspectors.length && <p>No inspectors available.</p>}
                        </div>
                    </aside>
                    <section className="messaging_conversation" aria-label={recipient ? `Messages with ${recipient.name}` : 'Messages'}>
                        {recipient ? <>
                            <header className="messaging_conversation_header">
                                <h2>{recipient.name}</h2>
                                <p>{recipient.email}</p>
                            </header>
                            <div className="messaging_messages" role="log" aria-label={`Conversation with ${recipient.name}`} aria-live="polite">
                                {conversation.length ? conversation.map((message) => (
                                    <article className={`messaging_message${message.sender === 'inspector' ? ' messaging_message_reply' : ''}`} key={message.id}>
                                        <span className="messaging_message_sender">{message.sender === 'inspector' ? `${recipient.name}${message.demo ? ' · Demo reply' : ''}` : 'You'}</span>
                                        <p>{message.text}</p>
                                        <time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleString()}</time>
                                    </article>
                                )) : <p className="messaging_empty">No messages with {recipient.name} yet.</p>}
                            </div>
                            <form className="messaging_composer" onSubmit={sendMessage}>
                                <label htmlFor="message-draft">Message {recipient.name}</label>
                                <textarea id="message-draft" rows={3} placeholder="Type your message…" value={draft}
                                    onChange={(event) => setDrafts((current) => ({ ...current, [recipientId]: event.target.value }))} />
                                <div className="messaging_composer_actions">
                                    <small>Demo messages are saved in this browser session.</small>
                                    <button type="submit" disabled={!draft.trim()}>Send Message</button>
                                </div>
                            </form>
                        </> : <p className="messaging_empty">Select an inspector to message.</p>}
                    </section>
                </div>
            </main>
            <footer className="bid_page_footer" />
        </div>
    );
}
