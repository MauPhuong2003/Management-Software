import api from './api';

export const miniGameService = {
  getMiniGame: async () => {
    const res = await api.get('/minigame');
    return res.data;
  },
  upsertMiniGame: async (payload: any) => {
    const res = await api.post('/minigame', payload);
    return res.data;
  },
  toggleMiniGame: async () => {
    const res = await api.put('/minigame/toggle');
    return res.data;
  },
  getSpinHistory: async (params?: { page?: number; limit?: number; prizeType?: string }) => {
    const res = await api.get('/minigame/history', { params });
    return res.data;
  },
  updateRewardStatus: async (historyId: string, payload: { rewardStatus: string; adminNote?: string }) => {
    const res = await api.put(`/minigame/history/${historyId}/reward`, payload);
    return res.data;
  },
  resetSlotQuantity: async (slotId: string) => {
    const res = await api.put(`/minigame/slots/${slotId}/reset`);
    return res.data;
  },
  getGifts: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get('/gifts', { params });
    return res.data;
  },
  createGift: async (payload: any) => {
    const res = await api.post('/gifts', payload);
    return res.data;
  },
  updateGift: async (id: string, payload: any) => {
    const res = await api.put(`/gifts/${id}`, payload);
    return res.data;
  },
  deleteGift: async (id: string) => {
    const res = await api.delete(`/gifts/${id}`);
    return res.data;
  }
};
