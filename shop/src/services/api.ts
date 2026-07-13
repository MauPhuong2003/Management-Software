import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/shop',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shop_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('shop_token');
      localStorage.removeItem('shop_customer');
      // Redirect or let state management handle it
    }
    return Promise.reject(error);
  }
);

export default api;
