import api from './api';
export const orderService = {
  getOrders: async (params?: any) => {
    const res = await api.get('/orders', { params });
    return res.data;
  },
  updateOrderStatus: async (id: string, status: string) => {
    const res = await api.patch(`/orders/${id}/status`, { status });
    return res.data;
  }
};
