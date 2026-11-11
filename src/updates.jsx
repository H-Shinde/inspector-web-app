import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { inspectorRequest } from './inspectorApi';
const empty = { counts: {}, total: 0, records: [], conversations: [], notifications: [], throughId: 0 };
const defaultSnapshot = { ...empty, loaded: false, visible: 0, read: async () => {} };
const Updates = createContext(null);
// DataTables renders cells in separate React roots; share the same scoped snapshot.
let snapshot = defaultSnapshot;
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const publish = (value) => { snapshot = value; listeners.forEach((listener) => listener()); };
const getSnapshot = () => snapshot;
const css = `
.app-update-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 19px; height: 19px; padding: 0 5px; margin-left: 5px; border-radius: 99px; background: #b42318; color: white; font: 600 11px/1 var(--font-family-ui); vertical-align: middle; }
.app-record-update { display: inline-block; padding: 3px 7px; margin-left: 7px; border-radius: 99px; background: #dceefe; color: #075581; font: 600 11px/1.3 var(--font-family-ui); white-space: nowrap; }
.app-updates { position: fixed; right: 20px; bottom: 20px; z-index: 1200; font: 14px/1.5 var(--font-family-ui); color: #1f2937; }
.app-updates--inspector { right: max(16px, calc((100vw - 480px) / 2 + 16px)); bottom: 86px; }
.app-updates-toggle { border: 1px solid #b7cfde; border-radius: 99px; padding: 10px 14px; background: white; color: #005581; font: inherit; font-weight: 600; box-shadow: 0 4px 18px #00284124; cursor: pointer; }
.app-updates-panel { position: absolute; bottom: 52px; right: 0; width: min(360px, calc(100vw - 32px)); max-height: min(65vh, 600px); overflow-y: auto; padding: 16px; border: 1px solid #c8d4e0; border-radius: 14px; background: white; box-shadow: 0 12px 40px #00284130; }
.app-updates-panel header { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.app-updates-panel h2 { margin: 0; font: 700 17px/1.4 var(--font-family-ui); color: #005581; }
.app-updates-panel ul { list-style: none; padding: 0; margin: 12px 0 0; }
.app-updates-panel li { padding: 12px 0; border-top: 1px solid #e2e8f0; }
.app-updates-panel a { display: block; color: #005581; text-decoration: none; font-weight: 600; }
.app-updates-panel time { display: block; color: #64748b; font-size: 11px; margin-top: 4px; }
.app-updates-panel button { cursor: pointer; font: inherit; font-size: 12px; color: #005581; background: white; border: 1px solid #c8d4e0; border-radius: 6px; padding: 4px 7px; }
.app-updates-panel button:disabled { opacity: .6; cursor: wait; }
.app-updates-panel button:focus-visible, .app-updates-panel a:focus-visible, .app-updates-toggle:focus-visible { outline: 2px solid #005581; outline-offset: 3px; }
.app-update-announcement { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
`;
export const useUpdates = () => { const context = useContext(Updates); const shared = useSyncExternalStore(subscribe, getSnapshot, getSnapshot); return context || shared; };
export function UpdateBadge({ kind, conversationId }) {
    const data = useUpdates();
    const count = conversationId != null ? data.conversations.find((row) => String(row.conversationId) === String(conversationId))?.count || 0
        : kind === 'work' ? (data.counts.job || 0) + (data.counts.bid || 0) : data.counts[kind] || 0;
    return count > 0 ? <span className="app-update-badge" aria-label={`${count} unread ${kind === 'message' ? 'messages' : 'updates'}`}>{count > 99 ? '99+' : count}</span> : null;
}
export function RecordUpdateBadge({ kind, id }) {
    const { records } = useUpdates();
    const record = records.find((row) => row.kind === kind && String(row.objectId) === String(id));
    return record ? <span className="app-record-update">{record.isNew ? 'New' : 'Updated'}</span> : null;
}
export function useUpdatesRefresh(kind, callback) {
    const data = useUpdates();
    const callbackRef = useRef(callback); callbackRef.current = callback;
    const last = useRef(0);
    const version = Math.max(0, ...data.records.filter((row) => row.kind === kind).map((row) => row.lastId));
    useEffect(() => { if (version > last.current) { last.current = version; callbackRef.current(); } }, [version]);
}
export function useRecordSeen(kind, id, version) {
    const data = useUpdates();
    const once = useRef(null);
    const record = data.records.find((row) => row.kind === kind && String(row.objectId) === String(id));
    useEffect(() => {
        const attempt = () => {
            if (id == null) { once.current = null; return; }
            if (!data.loaded || document.visibilityState === 'hidden') return;
            if (version == null && once.current === `${kind}:${id}`) return;
            if (version == null) once.current = `${kind}:${id}`;
            if (record && (version == null || version >= record.version)) void data.read({ kind, objectId: Number(id), throughId: record.lastId });
        };
        attempt(); document.addEventListener('visibilitychange', attempt);
        return () => document.removeEventListener('visibilitychange', attempt);
    }, [data.loaded, data.visible, kind, id, version, record?.lastId, data.read]);
}
export function useConversationSeen(conversationId, latestMessageId) {
    const data = useUpdates();
    const conversation = data.conversations.find((row) => String(row.conversationId) === String(conversationId));
    useEffect(() => {
        if (document.visibilityState !== 'hidden' && conversation && latestMessageId >= conversation.lastMessageId) {
            void data.read({ kind: 'message', conversationId: Number(conversationId), throughId: conversation.lastId });
        }
    }, [conversationId, latestMessageId, conversation?.lastId, data.visible, data.read]);
}
export function UpdatesProvider({ children }) {
    const inspector = true;
    const base = inspector ? '/api/inspector/' : '/api/';
    const [data, setData] = useState(empty);
    const [enabled, setEnabled] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [visible, setVisible] = useState(0);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const sequence = useRef(0);
    const refresh = useCallback(async () => {
        const request = ++sequence.current;
        try {
            const result = await inspectorRequest(base + 'notifications/');
            if (request === sequence.current) { setData(result); setLoaded(true); setEnabled(true); }
        } catch (error) {
            if (request !== sequence.current) return;
            if ([401, 403, 404].includes(error.status)) { setEnabled(false); setLoaded(false); setData(empty); }
            else setError('Unable to refresh updates. Please try again.');
        }
    }, [base]);
    const read = useCallback(async (values) => {
        setBusy(true);
        try { await inspectorRequest(base + 'notifications/', values); await refresh(); setError(''); }
        catch (error) { setError(error.message); }
        finally { setBusy(false); }
    }, [base, refresh]);
    useEffect(() => {
        void refresh();
        const focus = () => { setVisible((value) => value + 1); void refresh(); };
        const visibility = () => { if (document.visibilityState !== 'hidden') focus(); };
        window.addEventListener('app-session-changed', focus);
        window.addEventListener('focus', focus);
        document.addEventListener('visibilitychange', visibility);
        return () => { sequence.current++; window.removeEventListener('app-session-changed', focus); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visibility); };
    }, [refresh]);
    useEffect(() => {
        if (!enabled) return;
        if (typeof EventSource === 'undefined') { const timer = window.setInterval(refresh, 3000); return () => window.clearInterval(timer); }
        const updates = new EventSource(base + 'notification-events/', { withCredentials: true });
        updates.addEventListener('updates-changed', refresh);
        updates.addEventListener('session-expired', () => { updates.close(); setEnabled(false); setLoaded(false); setData(empty); });
        return () => updates.close();
    }, [enabled, base, refresh]);
    useEffect(() => { publish({ ...data, loaded, visible, read }); }, [data, loaded, visible, read]);
    useEffect(() => () => publish(defaultSnapshot), []);
    return <Updates.Provider value={{ ...data, loaded, visible, read }}>
        <style>{css}</style>{children}
        {enabled && <aside className={`app-updates${inspector ? ' app-updates--inspector' : ''}`} aria-label="Updates">
            <button type="button" className="app-updates-toggle" aria-expanded={open} aria-controls="app-updates-panel" onClick={() => setOpen(!open)}>Updates {data.total > 0 && <span className="app-update-badge" aria-label={`${data.total} unread updates`}>{data.total > 99 ? '99+' : data.total}</span>}</button>
            <span className="app-update-announcement" role="status">{data.total} unread updates</span>
            {open && <section id="app-updates-panel" className="app-updates-panel" aria-label="Unread updates">
                <header><h2>Updates</h2><button type="button" onClick={() => setOpen(false)}>Close</button></header>
                {error && <p role="alert">{error} <button type="button" onClick={refresh}>Retry</button></p>}
                {data.total > 0 && <button type="button" disabled={busy} onClick={() => read({ all: true, throughId: data.throughId })}>Mark all read</button>}
                <ul>{data.notifications.map((notification) => <li key={notification.id}>
                    <a href={notification.target} onClick={(event) => { if (inspector) { event.preventDefault(); window.dispatchEvent(new CustomEvent('app-open-update', { detail: notification })); } setOpen(false); }}>{notification.title}</a>
                    <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                    <button type="button" disabled={busy} onClick={() => read(notification.kind === 'message' ? { kind: 'message', conversationId: notification.conversationId, throughId: notification.id } : { kind: notification.kind, objectId: notification.objectId, throughId: notification.id })}>Mark read</button>
                </li>)}</ul>
                {!data.total && <p>You're all caught up.</p>}
                {data.notifications.length === 100 && <p>Showing the latest 100 unread updates.</p>}
            </section>}
        </aside>}
    </Updates.Provider>;
}
