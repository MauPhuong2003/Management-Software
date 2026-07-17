import api from './api';

export const shopService = {
  // Store settings & configurations
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },

  // Categories tree
  getCategories: async () => {
    const res = await api.get('/categories');
    return res.data;
  },

  // Public products list & filter
  getProducts: async (params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
    isFeatured?: boolean;
  }) => {
    const res = await api.get('/products', { params });
    return res.data;
  },

  // Product detail
  getProductDetail: async (id: string) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },

  // Promotions
  getActivePromotions: async () => {
    const res = await api.get('/promotions/active');
    return res.data;
  },

  // Flash Sale
  getActiveFlashSale: async () => {
    const res = await api.get('/flash-sales/active');
    return res.data;
  },

  // Checkout configs
  getShippingConfig: async () => {
    const res = await api.get('/checkout/shipping');
    return res.data;
  },

  getBranches: async () => {
    const res = await api.get('/checkout/branches');
    return res.data;
  },

  validateVoucher: async (payload: { code: string; orderAmount: number; items?: any[] }) => {
    const res = await api.post('/checkout/validate-voucher', payload);
    return res.data;
  },

  getLoyaltyConfig: async () => {
    const res = await api.get('/loyalty-config');
    return res.data;
  },

  placeOrder: async (payload: any) => {
    const res = await api.post('/checkout/place-order', payload);
    return res.data;
  },

  // Auth customer
  register: async (payload: any) => {
    const res = await api.post('/auth/register', payload);
    return res.data;
  },

  login: async (payload: any) => {
    const res = await api.post('/auth/login', payload);
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get('/auth/profile');
    return res.data;
  },

  updateProfile: async (payload: any) => {
    const res = await api.put('/auth/profile', payload);
    return res.data;
  },

  getLoyaltyHistory: async () => {
    const res = await api.get('/auth/loyalty-history');
    return res.data;
  },

  // Customer shipping addresses
  getAddresses: async () => {
    const res = await api.get('/auth/addresses');
    return res.data;
  },

  addAddress: async (payload: any) => {
    const res = await api.post('/auth/addresses', payload);
    return res.data;
  },

  updateAddress: async (id: string, payload: any) => {
    const res = await api.put(`/auth/addresses/${id}`, payload);
    return res.data;
  },

  deleteAddress: async (id: string) => {
    const res = await api.delete(`/auth/addresses/${id}`);
    return res.data;
  },

  // Customer orders
  getOrders: async (params?: { status?: string }) => {
    const res = await api.get('/orders', { params });
    return res.data;
  },

  getOrderDetail: async (id: string) => {
    const res = await api.get(`/orders/${id}`);
    return res.data;
  },

  cancelOrder: async (id: string) => {
    const res = await api.post(`/orders/${id}/cancel`);
    return res.data;
  },

  requestReturn: async (id: string, payload: { reason: string; images: string[] }) => {
    const res = await api.post(`/orders/${id}/return`, payload);
    return res.data;
  },

  submitPaymentProof: async (id: string, payload: { paymentProof: string }) => {
    const res = await api.put(`/orders/${id}/payment-proof`, payload);
    return res.data;
  },

  uploadProofImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('shop_token');
    const axios = (await import('axios')).default;
    const res = await axios.post('http://localhost:5000/api/admin/upload/customer', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
    return res.data;
  },

  changePassword: async (payload: any) => {
    const res = await api.post('/auth/change-password', payload);
    return res.data;
  },

  sendOTP: async (payload: { phone: string }) => {
    const res = await api.post('/auth/send-otp', payload);
    return res.data;
  },

  forgotPassword: async (payload: any) => {
    const res = await api.post('/auth/forgot-password', payload);
    return res.data;
  },

  // MiniGame
  getActiveMiniGame: async () => {
    const res = await api.get('/minigame/active');
    return res.data;
  },
  exchangePointsForSpins: async (payload: { quantity: number }) => {
    const res = await api.post('/minigame/exchange-points', payload);
    return res.data;
  },
  spin: async () => {
    const res = await api.post('/minigame/spin');
    return res.data;
  },
  getSpinHistory: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get('/minigame/history', { params });
    return res.data;
  },
};
export default shopService;
