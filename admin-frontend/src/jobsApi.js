import { apiRequest, apiWrite } from './authApi';
export const listJobs = (signal, history = false) => apiRequest(`/api/jobs/${history ? '?history=1' : ''}`, { signal }).then((data) => data.jobs);
export const getJob = (id, signal) => apiRequest(`/api/jobs/${encodeURIComponent(id)}/`, { signal });
export const createJob = (bidId) => apiWrite('/api/jobs/', { bidId });
export const updateJob = (id, values) => apiWrite(`/api/jobs/${encodeURIComponent(id)}/`, values, { method: 'PATCH' });
export const finishJob = (job) => updateJob(job.id, { status: 'Complete', revision: job.revision });
export const deleteJob = (job) => updateJob(job.id, { status: 'Deleted', revision: job.revision });
