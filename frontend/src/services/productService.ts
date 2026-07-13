import api from './api';

export const productService = {
  getProducts: async (params?: any) => {
    const res = await api.get('/products', { params });
    return res.data;
  },
  createProduct: async (data: any) => {
    const res = await api.post('/products', data);
    return res.data;
  },
  updateProduct: async (id: string, data: any) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
  },
  deleteProduct: async (id: string) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },
  bulkImportProducts: async (data: any[]) => {
    const res = await api.post('/products/bulk-import', data);
    return res.data;
  }
};
