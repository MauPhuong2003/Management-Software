import api from './api';
export const promotionService = {
  getPromotions: async (params?: any) => {
    const res = await api.get('/promotions', { params });
    return res.data;
  },
  createPromotion: async (data: any) => {
    const res = await api.post('/promotions', data);
    return res.data;
  },
  updatePromotion: async (id: string, data: any) => {
    const res = await api.put(`/promotions/${id}`, data);
    return res.data;
  },
  deletePromotion: async (id: string) => {
    const res = await api.delete(`/promotions/${id}`);
    return res.data;
  }
};
