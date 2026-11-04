import { listJobs, getJob, updateJob, createJob, finishJob } from './jobsApi';
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { delete global.fetch; });
const response = (data) => ({ ok: true, status: 200, json: jest.fn().mockResolvedValue(data) });
test('loads jobs and history from authenticated Django endpoints', async () => {
    fetch.mockResolvedValueOnce(response({ jobs: [{ id: 42 }] }));
    expect(await listJobs(undefined, true)).toEqual([{ id: 42 }]);
    expect(fetch.mock.calls[0][0]).toBe('/api/jobs/?history=1');
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
    fetch.mockResolvedValueOnce(response({ id: 42 }));
    expect(await getJob(42)).toEqual({ id: 42 });
});
test('saves job items with CSRF and a revision', async () => {
    fetch.mockResolvedValueOnce(response({ csrfToken: 'token' })).mockResolvedValueOnce(response({ id: 42, revision: 2 }));
    await updateJob(42, { items: [], revision: 1 });
    const [url, request] = fetch.mock.calls[1];
    expect(url).toBe('/api/jobs/42/');
    expect(request.method).toBe('PATCH');
    expect(request.headers['X-CSRFToken']).toBe('token');
    expect(JSON.parse(request.body)).toEqual({ items: [], revision: 1 });
});
