import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectorJob } from './inspectorApi.js';
for (const [server, display] of [['Pending Review', 'pending-review'], ['Needs Changes', 'needs-changes'], ['Complete', 'completed'], ['In-Progress', 'in-progress']]) {
    test(`maps ${server} without losing review feedback or inspection parts`, () => {
        const row = inspectorJob({ status: server, reviewNotes: 'Fix serial', inspectionParts: [{ id: 'part', name: 'Desk' }] });
        assert.equal(row.status, display);
        assert.equal(row.reviewNotes, 'Fix serial');
        assert.equal(row.parts[0].id, 'part');
    });
}


test('preserves the bid item count and maps its request date for the acceptance screen', () => {
    const row = inspectorJob({ status: 'Assigned', date: '2026-11-12', valueDate: '2027-01-01', expectedItemCount: 5 });
    assert.equal(row.requestDate, '2026-11-12');
    assert.equal(row.expectedItemCount, 5);
});
