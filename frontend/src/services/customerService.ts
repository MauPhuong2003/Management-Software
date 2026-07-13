import api from './api';
export const customerService = {
  getCustomers: async (params?: any) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  createCustomer: async (data: any) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  updateCustomer: async (id: string, data: any) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  deleteCustomer: async (id: string) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  }
};
