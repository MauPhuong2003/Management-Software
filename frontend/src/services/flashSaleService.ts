import api from './api';

export const flashSaleService = {
  getFlashSales: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get('/flash-sales', { params });
    return res.data;
  },
  createFlashSale: async (payload: any) => {
    const res = await api.post('/flash-sales', payload);
    return res.data;
  },
  updateFlashSale: async (id: string, payload: any) => {
    const res = await api.put(`/flash-sales/${id}`, payload);
    return res.data;
  },
  deleteFlashSale: async (id: string) => {
    const res = await api.delete(`/flash-sales/${id}`);
    return res.data;
  }
};
