import api from './api';
export const orderService = {
  getOrders: async (params?: any) => {
    const res = await api.get('/orders', { params });
    return res.data;
  },
  updateOrderStatus: async (id: string, payload: { status?: string; paymentStatus?: string }) => {
    const res = await api.patch(`/orders/${id}/status`, payload);
    return res.data;
  },
  approveReturn: async (id: string, adminComment: string) => {
    const res = await api.post(`/orders/${id}/return/approve`, { adminComment });
    return res.data;
  },
  rejectReturn: async (id: string, adminComment: string) => {
    const res = await api.post(`/orders/${id}/return/reject`, { adminComment });
    return res.data;
  }
};
