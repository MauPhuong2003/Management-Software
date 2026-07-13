import api from './api';

export const categoryService = {
  getCategories: async (params?: any) => {
    const res = await api.get('/categories', { params });
    return res.data;
  },
  createCategory: async (data: any) => {
    const res = await api.post('/categories', data);
    return res.data;
  },
  updateCategory: async (id: string, data: any) => {
    const res = await api.put(`/categories/${id}`, data);
    return res.data;
  },
  deleteCategory: async (id: string) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  }
};
