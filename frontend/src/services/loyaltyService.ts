import api from './api';

export const loyaltyService = {
  getConfig: async () => {
    const res = await api.get('/loyalty/config');
    return res.data;
  },
  updateConfig: async (data: any) => {
    const res = await api.put('/loyalty/config', data);
    return res.data;
  },
  recalculateAllTiers: async () => {
    const res = await api.post('/loyalty/recalculate');
    return res.data;
  },
  adjustPoints: async (customerId: string, points: number, reason?: string) => {
    const res = await api.post(`/loyalty/adjust/${customerId}`, { points, reason });
    return res.data;
  },
  backfillPoints: async () => {
    const res = await api.post('/loyalty/backfill');
    return res.data;
  },
  getPointHistory: async (customerId: string) => {
    const res = await api.get(`/loyalty/history/${customerId}`);
    return res.data;
  }
};
