import api from './api';

export const warehouseService = {
  getWarehouses: async () => {
    const res = await api.get('/warehouses');
    return res.data;
  },
  createWarehouse: async (data: any) => {
    const res = await api.post('/warehouses', data);
    return res.data;
  },
  updateWarehouse: async (id: string, data: any) => {
    const res = await api.put(`/warehouses/${id}`, data);
    return res.data;
  },
  deleteWarehouse: async (id: string) => {
    const res = await api.delete(`/warehouses/${id}`);
    return res.data;
  }
};
