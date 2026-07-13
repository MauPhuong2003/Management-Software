import api from './api';

export const settingService = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  updateSettings: async (data: any) => {
    const res = await api.put('/settings', data);
    return res.data;
  },
  getRoles: async () => {
    const res = await api.get('/settings/roles');
    return res.data;
  },
  createRole: async (data: any) => {
    const res = await api.post('/settings/roles', data);
    return res.data;
  },
  updateRole: async (id: string, data: any) => {
    const res = await api.put(`/settings/roles/${id}`, data);
    return res.data;
  },
  deleteRole: async (id: string) => {
    const res = await api.delete(`/settings/roles/${id}`);
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/settings/users');
    return res.data;
  },
  createUser: async (data: any) => {
    const res = await api.post('/settings/users', data);
    return res.data;
  },
  updateUser: async (id: string, data: any) => {
    const res = await api.put(`/settings/users/${id}`, data);
    return res.data;
  },
  deleteUser: async (id: string) => {
    const res = await api.delete(`/settings/users/${id}`);
    return res.data;
  }
};
