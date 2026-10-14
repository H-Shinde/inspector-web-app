import { sortInspectorsByDistance } from './Inspectordistance';

const job = { city: 'Washington', state: 'DC', zipCode: '20001' };

test('sorts inspectors closest to the job first and puts unknown locations last', () => {
    const inspectors = [
        { id: 1, name: 'Unknown Ursula' },
        { id: 2, name: 'Far Fred', city: 'Alexandria', state: 'VA' },
        { id: 3, name: 'Near Nina', zipCode: '20001' },
        { id: 4, name: 'Mid Max', city: 'Arlington', state: 'VA' },
    ];
    expect(sortInspectorsByDistance(inspectors, job).map(({ inspector }) => inspector.name))
        .toEqual(['Near Nina', 'Mid Max', 'Far Fred', 'Unknown Ursula']);
});

test('keeps names alphabetical when the job location is unknown', () => {
    const result = sortInspectorsByDistance([{ name: 'B' }, { name: 'A' }], {});
    expect(result.map(({ inspector }) => inspector.name)).toEqual(['A', 'B']);
    expect(result[0].distance).toBeNull();
});