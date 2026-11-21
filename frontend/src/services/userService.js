import api from './api';

export const userService = {
  getUsers: async (params) => {
    const res = await api.get('/api/users', { params });
    return res.data;
  },

  getUserById: async (id) => {
    const res = await api.get(`/api/users/${id}`);
    return res.data;
  },

  updateUserRole: async (id, role) => {
    const res = await api.put(`/api/users/${id}/role`, { role });
    return res.data;
  },

  updateUserStatus: async (id, isActive) => {
    const res = await api.put(`/api/users/${id}/status`, { isActive });
    return res.data;
  },

  getUserStats: async () => {
    const res = await api.get('/api/users/stats/overview');
    return res.data;
  },
};
