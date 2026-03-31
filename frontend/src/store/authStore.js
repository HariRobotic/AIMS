import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  token: sessionStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ username, password });
      sessionStorage.setItem('access_token', data.access_token);
      set({ user: data.user, token: data.access_token, isLoading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register(payload);
      set({ isLoading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await authAPI.me();
      set({ user: data });
    } catch {
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      set({ user: null, token: null });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;