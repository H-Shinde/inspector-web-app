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
