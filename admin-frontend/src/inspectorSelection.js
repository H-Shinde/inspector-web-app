import { useSyncExternalStore } from 'react';
import { readBidList } from './bidFields';
import { emptyInspector } from './inspectorFields';

export const demoInspectors = [
    { id: 1, name: 'Alex Morgan', distance: 12, company: 'Morgan Asset Services', status: 'Active', focus: 'Appraisal', email: 'alex.morgan@example.com' },
    { id: 2, name: 'Jordan Lee', distance: 24, company: 'Summit Inspections', status: 'Active', focus: 'Inspection', email: 'jordan.lee@example.com' },
    { id: 3, name: 'Taylor Brooks', distance: 8, company: 'Brooks Valuations', status: 'Active', focus: 'Appraisal, Inspection', email: 'taylor.brooks@example.com' },
    { id: 4, name: 'Casey Rivera', distance: 36, company: 'Rivera Field Services', status: 'Inactive', focus: 'Inspection', email: 'casey.rivera@example.com' },
    { id: 5, name: 'Morgan Ellis', distance: 18, company: 'Ellis Appraisal Group', status: 'Active', focus: 'Appraisal', email: 'morgan.ellis@example.com' },
    { id: 6, name: 'Jamie Parker', distance: 42, company: 'Parker Equipment Services', status: 'Invited', focus: 'Appraisal, Inspection', email: 'jamie.parker@example.com' },
    ...[
        ['Avery Wilson', 'Wilson Field Services', 15, 'Inspection'],
        ['Sam Bennett', 'Bennett Valuations', 29, 'Appraisal'],
        ['Drew Hayes', 'Hayes Asset Group', 33, 'Appraisal, Inspection'],
        ['Quinn Foster', 'Foster Inspections', 21, 'Inspection'],
        ['Reese Kim', 'Kim Equipment Appraisals', 47, 'Appraisal'],
        ['Dakota Lewis', 'Lewis Field Services', 10, 'Inspection'],
        ['Jamie Chen', 'Chen Valuation Partners', 26, 'Appraisal, Inspection'],
        ['Riley Carter', 'Carter Asset Services', 39, 'Inspection'],
        ['Skyler Reed', 'Reed Appraisal Group', 19, 'Appraisal'],
    ].map(([name, company, distance, focus], index) => ({ id: 101 + index, name, company, distance, focus, status: 'Active', email: `${name.toLowerCase().replace(/ /g, '.')}@example.com` })),
].map((inspector, index) => ({
    ...inspector,
    phone: `202-555-${String(101 + index).padStart(4, '0')}`,
    address: `${120 + index * 15} Example Avenue`,
    cityStateZip: ['Washington, DC 20001', 'Arlington, VA 22201', 'Alexandria, VA 22301'][index % 3],
    region: ['Mid-Atlantic', 'Northern Virginia', 'Washington Metro'][index % 3],
    notes: 'Sample inspector profile. Available for equipment appraisals and on-site inspections by appointment.',
    numberOfJobs: [24, 18, 32, 11, 27, 0][index % 6],
    lastJobDate: ['2026-10-02', '2026-09-28', '2026-10-05', '2026-08-19', '2026-09-30', '2026-09-15'][index % 6],
}));
let inspectorDirectory = [];
export function setInspectorDirectory(records) { inspectorDirectory = records; }
export function getInspectors() { return inspectorDirectory; }

function subscribe(callback) {
    window.addEventListener('inspector-selection-changed', callback);
    window.addEventListener('storage', callback);
    return () => {
        window.removeEventListener('inspector-selection-changed', callback);
        window.removeEventListener('storage', callback);
    };
}

export function assignInspectorToJob(job, inspector) {
    const updated = { ...job, inspector };
    sessionStorage.setItem('jobAssignments', JSON.stringify([
        ...readBidList('jobAssignments').filter((entry) => String(entry.jobId) !== String(job.id)),
        { jobId: job.id, inspector },
    ]));
    for (const key of ['availableJobs', 'acceptedJobs', 'createdJobs']) {
        sessionStorage.setItem(key, JSON.stringify(readBidList(key).map((entry) =>
            String(entry.id) === String(job.id) ? { ...entry, inspector } : entry)));
    }
    sessionStorage.setItem('selectedJob', JSON.stringify(updated));
    return updated;
}

export function selectGlobalInspector(id) {
    if (id == null || id === '') sessionStorage.removeItem('selectedInspectorId');
    else sessionStorage.setItem('selectedInspectorId', String(id));
    window.dispatchEvent(new Event('inspector-selection-changed'));
}

export function useSelectedInspector() {
    const id = useSyncExternalStore(subscribe, () => sessionStorage.getItem('selectedInspectorId'));
    return getInspectors().find((inspector) => String(inspector.id) === id) ?? null;
}

export function addInvitedInspector(draft) {
    const inspector = {
        ...draft, name: draft.name.trim(), email: draft.email.trim(),
        distance: draft.distance === '' ? '' : Number(draft.distance),
        numberOfJobs: Number(draft.numberOfJobs || 0),
        id: Math.max(0, ...getInspectors().map((entry) => Number(entry.id) || 0)) + 1,
        status: 'Invited',
    };
    sessionStorage.setItem('invitedInspectors', JSON.stringify([...readBidList('invitedInspectors'), inspector]));
    window.dispatchEvent(new Event('inspector-selection-changed'));
    return inspector;
}

// Change this to wherever the inspector sign-up page is routed.
export const INSPECTOR_SIGNUP_PATH = '/InspectorSignup';

export function buildInspectorInviteLink(inspector) {
    return `${window.location.origin}${INSPECTOR_SIGNUP_PATH}?invite=${encodeURIComponent(inspector.inviteToken)}&email=${encodeURIComponent(inspector.email)}`;
}

// One unique token per email: inviting the same email again reuses its existing invite.
export function createInspectorInvite(email) {
    const clean = email.trim();
    const existing = readBidList('invitedInspectors').find((entry) =>
        entry.inviteToken && String(entry.email).toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const token = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    return addInvitedInspector({ ...emptyInspector, name: clean, email: clean, inviteToken: token });
}