import test from 'node:test';
import assert from 'node:assert/strict';
import { CONDITIONS, FIELDS, partStatus, emptyPart } from './parts.js';
test('condition uses the five supported choices and mileage includes hours', () => {
    assert.deepEqual(CONDITIONS, ['Very Good', 'Good', 'Fair', 'Poor', 'Scrap']);
    assert.equal(FIELDS.find(([key]) => key === 'mileage')[1], 'Mileage/Hours');
});
test('invalid legacy conditions must be corrected before a part is complete', () => {
    const part = { ...emptyPart(), ...Object.fromEntries(FIELDS.map(([key]) => [key, 'N/A'])), condition: 'Good' };
    assert.equal(partStatus(part), 'completed');
    assert.equal(partStatus({ ...part, condition: '6' }), 'in-progress');
});
