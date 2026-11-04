// Distance helpers for ordering inspectors by how close they are to a job.
// Location is resolved from (in order): latitude/longitude, a known ZIP code, or a known city/state.
// Extend ZIP_COORDS / CITY_COORDS (or store lat/lng on inspectors and jobs) for real data.

const ZIP_COORDS = {
    '20001': [38.9122, -77.0177],
    '22201': [38.8890, -77.0955],
    '22301': [38.8200, -77.0580],
};

const CITY_COORDS = {
    'washington, dc': [38.9072, -77.0369],
    'arlington, va': [38.8816, -77.0910],
    'alexandria, va': [38.8048, -77.0469],
};

const pick = (source, keys) => {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
};

export function resolveCoordinates(place) {
    if (!place) return null;
    const lat = Number(pick(place, ['latitude', 'lat']));
    const lng = Number(pick(place, ['longitude', 'lng', 'lon']));
    if (pick(place, ['latitude', 'lat']) !== undefined && pick(place, ['longitude', 'lng', 'lon']) !== undefined
        && Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    const zip = String(pick(place, ['zipCode', 'zip', 'postalCode']) ?? '').slice(0, 5);
    if (ZIP_COORDS[zip]) return ZIP_COORDS[zip];
    const city = pick(place, ['city']);
    const state = pick(place, ['state']);
    if (city && state) return CITY_COORDS[`${String(city).trim().toLowerCase()}, ${String(state).trim().toLowerCase()}`] ?? null;
    return null;
}

export function distanceMiles(a, b) {
    const from = resolveCoordinates(a);
    const to = resolveCoordinates(b);
    if (!from || !to) return null;
    const rad = (deg) => deg * Math.PI / 180;
    const dLat = rad(to[0] - from[0]);
    const dLng = rad(to[1] - from[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from[0])) * Math.cos(rad(to[0])) * Math.sin(dLng / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

// Returns [{ inspector, distance }] closest first. Inspectors with an unknown location go last (A-Z).
export function sortInspectorsByDistance(inspectors, job) {
    return inspectors
        .map((inspector) => ({ inspector, distance: distanceMiles(inspector, job) }))
        .sort((a, b) => {
            if (a.distance === null && b.distance === null) return String(a.inspector.name).localeCompare(String(b.inspector.name));
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance || String(a.inspector.name).localeCompare(String(b.inspector.name));
        });
}