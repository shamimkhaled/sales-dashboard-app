import api from './api';

const billService = {
  getAllBills: (params) => api.get('/bills', { params }),
  getBillById: (id) => api.get(`/bills/${id}`),
  createBill: (data) => api.post('/bills', data),
  updateBill: (id, data) => api.put(`/bills/${id}`, data),
  deleteBill: (id) => api.delete(`/bills/${id}`),
};

export { billService };
export default billService;