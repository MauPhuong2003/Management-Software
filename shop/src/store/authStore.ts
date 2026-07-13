import { create } from 'zustand';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  tier: string;
  loyaltyPoints: number;
}

interface AuthState {
  customer: Customer | null;
  token: string | null;
  setAuth: (customer: Customer, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: JSON.parse(localStorage.getItem('shop_customer') || 'null'),
  token: localStorage.getItem('shop_token') || null,
  setAuth: (customer, token) => {
    localStorage.setItem('shop_customer', JSON.stringify(customer));
    localStorage.setItem('shop_token', token);
    set({ customer, token });
  },
  logout: () => {
    localStorage.removeItem('shop_customer');
    localStorage.removeItem('shop_token');
    set({ customer: null, token: null });
  }
}));
