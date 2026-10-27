import { apiRequest, apiWrite } from './authApi';
export const getBidSettings = (signal) => apiRequest('/api/bid-settings/', { signal });
export const saveBidSettings = (rules) => apiWrite('/api/bid-settings/', { rules }, { method: 'PUT' });
