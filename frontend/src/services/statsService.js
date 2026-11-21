import api from './api';

export const statsService = {
  getOverview: async () => {
    const res = await api.get('/api/stats/overview');
    return res.data;
  },

  getMonthlyTrends: async () => {
    const res = await api.get('/api/stats/monthly');
    return res.data;
  },

  getTopBooks: async () => {
    const res = await api.get('/api/stats/top-books');
    return res.data;
  },

  getTopBorrowers: async () => {
    const res = await api.get('/api/stats/top-borrowers');
    return res.data;
  },
};
