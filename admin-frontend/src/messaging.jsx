import { useConversationSeen } from './updates';
import { UpdateBadge } from './updates';
import useInspectorDirectory from './useInspectorDirectory';
import ValidatedForm from './ValidatedForm';
import LogoutButton from './LogoutButton';
import { useEffect, useState, useRef } from 'react';
import navLogo from './bison_logo_nav.png';
import './messaging.css';
import { useSelectedInspector } from './inspectorSelection';
import { apiRequest, apiWrite } from './authApi';

export default function Messaging() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { inspectors } = useInspectorDirectory();
    const globallySelected = useSelectedInspector();
    const [recipientId, setRecipientId] = useState(() => new URLSearchParams(window.location.search).get('inspectorId') ?? globallySelected?.id ?? null);
    useEffect(() => { if (recipientId == null && inspectors.length) setRecipientId(inspectors[0].id); }, [inspectors, recipientId]);
    const recipient = inspectors.find((inspector) => String(inspector.id) === String(recipientId));
    const [messages, setMessages] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [hasEarlier, setHasEarlier] = useState(false);
    const deliveryId = useRef(null);
    const end = useRef(null);
    const draft = drafts[recipientId] || '';
    const conversation = messages;
    useConversationSeen(Number(messages.at(-1)?.inspectorId) === Number(recipientId) ? recipientId : null, messages.at(-1)?.id);
    const merge = (rows) => setMessages((previous) => [...new Map([...previous, ...rows].map((message) => [message.id, message])).values()].sort((a, b) => a.id - b.id));
    useEffect(() => {
        setMessages([]); setFiles([]); setError(''); setHasEarlier(false); deliveryId.current = null;
        if (!recipientId) return;
        const controller = new AbortController();
        const load = (initial = false) => apiRequest(`/api/messages/?inspectorId=${encodeURIComponent(recipientId)}`, { signal: controller.signal }).then((data) => {
            if (!controller.signal.aborted) { merge(data.messages); if (initial) setHasEarlier(data.hasEarlier); }
        }).catch((error) => { if (!controller.signal.aborted) setError(error.message); });
        void load(true);
        const updates = new EventSource(`/api/message-events/?inspectorId=${encodeURIComponent(recipientId)}`, { withCredentials: true });
        updates.addEventListener('messages-changed', () => { void load(); });
        return () => { controller.abort(); updates.close(); };
    }, [recipientId]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.at(-1)?.id]);
    const loadEarlier = async () => {
        try { const data = await apiRequest(`/api/messages/?inspectorId=${recipientId}&before=${messages[0].id}`); merge(data.messages); setHasEarlier(data.hasEarlier); }
        catch (error) { setError(error.message); }
    };
    const sendMessage = async (event) => {
        event.preventDefault();
        if (!recipient || busy || (!draft.trim() && !files.length)) return;
        setBusy(true); setError('');
        try {
            const values = new FormData();
            deliveryId.current ||= crypto.randomUUID();
            values.append('clientId', deliveryId.current); values.append('inspectorId', recipient.id); values.append('text', draft.trim());
            files.forEach((file) => values.append('files', file));
            const message = await apiWrite('/api/messages/', values, { multipart: true });
            merge([message]); setDrafts((current) => ({ ...current, [recipientId]: '' })); setFiles([]); deliveryId.current = null;
        } catch (error) { setError(error.message); }
        finally { setBusy(false); }
    };
    return (
        <div className="frame_home bid_details_page messaging_page">
            <nav className="nav_bar" aria-label="Main navigation">
                <a href="/Homepage"><img className="bison_logo_nav" src={navLogo} alt="Bison home" /></a>
                <div className="nav_links">
                    {['Bids', 'History', 'Inspector', 'Clients', 'Reports', 'Messaging'].map((label) => (
                        <div key={label} className={label === 'Messaging' ? 'bids_box_selected' : ''}>
                            <a className="nav_bar_text" href={label === 'Bids' ? '/Homepage' : `/${label}`}
                                aria-current={label === 'Messaging' ? 'page' : undefined}>{label}<UpdateBadge kind={label === 'Messaging' ? 'message' : label === 'Bids' ? 'work' : label === 'Inspector' ? 'inspector' : label === 'Clients' ? 'client' : null} /></a>
                        </div>
                    ))}
                </div>
                <button type="button" className="burger_icon_position" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                    <div className="burger_icon_frame"><div className="top_bun" /><div className="patty" /><div className="bottom_bun" /></div>
                </button>
                {menuOpen && <div className="hamburger_dropdown"><a className="dropdown_link" href="/Settings">Settings</a><LogoutButton /></div>}
            </nav>
            <main className="main_content">
                <header className="table_header"><h1>Messaging</h1></header>
                <div className="messaging_layout">
                    <aside className="messaging_sidebar" aria-label="Inspector recipients">
                        <h2>Inspectors</h2>
                        <div className="messaging_recipients">
                            {inspectors.map((inspector) => (
                                <button type="button" key={inspector.id}
                                    className={String(recipientId) === String(inspector.id) ? 'active' : ''}
                                    aria-pressed={String(recipientId) === String(inspector.id)}
                                    disabled={busy} onClick={() => setRecipientId(inspector.id)}>
                                    <span className="messaging_recipient_name">{inspector.name}<UpdateBadge kind="message" conversationId={inspector.id} /></span>
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
                                {hasEarlier && <button type="button" onClick={loadEarlier}>Load earlier messages</button>}
                                {conversation.length ? conversation.map((message) => (
                                    <article className={`messaging_message${message.from === 'inspector' ? ' messaging_message_reply' : ''}`} key={message.id}>
                                        <span className="messaging_message_sender">{message.from === 'inspector' ? recipient.name : 'You'}</span>
                                        <p>{message.text}</p>
                                        {message.attachments?.map((file) => file.type === 'video' ? <div key={file.id}><video className="message_attachment" src={file.url} controls /><a href={file.url} target="_blank" rel="noreferrer">{file.name}</a></div> : <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><img className="message_attachment" src={file.url} alt={file.name} /><span>{file.name}</span></a>)}
                                        <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
                                    </article>
                                )) : <p className="messaging_empty">No messages with {recipient.name} yet.</p>}
                                <div ref={end} />
                            </div>
                            {error && <p role="alert" className="add_bid_error">{error}</p>}
                            <ValidatedForm className="messaging_composer" onSubmit={sendMessage}>
                                <label htmlFor="message-draft">Message {recipient.name}</label>
                                <textarea id="message-draft" rows={3} maxLength={2000} disabled={busy} placeholder="Type your message…" value={draft}
                                    onChange={(event) => { deliveryId.current = null; setDrafts((current) => ({ ...current, [recipientId]: event.target.value })); }} />
                                <div className="messaging_composer_actions">
                                    <label>Attach images or videos<input type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" disabled={busy} onChange={(event) => { setFiles(Array.from(event.target.files || [])); event.target.value = ''; deliveryId.current = null; }} /></label><small>{files.map((file) => file.name).join(', ')}</small>
                                    <button type="submit" disabled={busy || (!draft.trim() && !files.length)}>{busy ? 'Sending...' : 'Send Message'}</button>
                                </div>
                            </ValidatedForm>
                        </> : <p className="messaging_empty">Select an inspector to message.</p>}
                    </section>
                </div>
            </main>
            <footer className="bid_page_footer" />
        </div>
    );
}
