import api from './api';

const dashboardService = {
  getOverview: () => api.get('/dashboard/overview'),
  getTopCustomers: () => api.get('/dashboard/top-customers'),
  getRevenueByService: () => api.get('/dashboard/revenue-by-service'),
  getCollectionStatus: () => api.get('/dashboard/collection-status'),
  getCustomerStatus: () => api.get('/dashboard/customer-status'),
};

export default dashboardService;
