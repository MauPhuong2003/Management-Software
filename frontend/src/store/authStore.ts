import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  email: string;
  role: any;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, accessToken: token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, accessToken: null });
  },
  hasPermission: (module: string, action: string) => {
    const user = get().user;
    if (!user) return false;
    if (user.role?.name === 'Admin') return true;
    const permissions = user.role?.permissions || [];
    return Array.isArray(permissions) && permissions.includes(`${module}_${action}`);
  }
}));
