import api from './api';

export const notificationService = {
  getNotifications: async (params) => {
    const res = await api.get('/api/notifications/', { params });
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get('/api/notifications/unread-count');
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await api.put(`/api/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await api.put('/api/notifications/read-all');
    return res.data;
  },

  deleteNotification: async (id) => {
    const res = await api.delete(`/api/notifications/${id}`);
    return res.data;
  },
};
