import api from './api';

export const shippingService = {
  getShippingConfig: async () => {
    const res = await api.get('/shipping');
    return res.data;
  },
  updateShippingConfig: async (data: any) => {
    const res = await api.put('/shipping', data);
    return res.data;
  }
};
