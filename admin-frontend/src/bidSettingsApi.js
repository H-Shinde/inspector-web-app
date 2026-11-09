import { apiRequest, apiWrite } from './authApi';
export const getBidSettings = (signal) => apiRequest('/api/bid-settings/', { signal });
export const saveBidSettings = (rules, tierRates) => apiWrite('/api/bid-settings/', { rules, ...(tierRates ? { tierRates } : {}) }, { method: 'PUT' });
