import api, { setAccessToken } from './api';

export const authService = {
  login: async (credentials) => {
    const res = await api.post('/api/auth/login', credentials);
    return res.data;
  },

  register: async (userData) => {
    const res = await api.post('/api/auth/register', userData);
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  getProfile: async () => {
    const res = await api.get('/api/auth/me');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await api.put('/api/auth/me', data);
    return res.data;
  },

  changePassword: async (passwords) => {
    const res = await api.put('/api/auth/me/password', passwords);
    return res.data;
  },
};
