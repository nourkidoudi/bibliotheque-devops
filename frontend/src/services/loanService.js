import api from './api';

export const loanService = {
  borrowBook: async (bookId) => {
    const res = await api.post('/api/loans/borrow', { bookId });
    return res.data;
  },

  returnBook: async (loanId) => {
    const res = await api.put(`/api/loans/${loanId}/return`);
    return res.data;
  },

  renewLoan: async (loanId) => {
    const res = await api.put(`/api/loans/${loanId}/renew`);
    return res.data;
  },

  getMyLoans: async (params) => {
    const res = await api.get('/api/loans/my-loans/', { params });
    return res.data;
  },

  getMyActiveLoans: async () => {
    const res = await api.get('/api/loans/my-loans/active/');
    return res.data;
  },

  getAllLoans: async (params) => {
    const res = await api.get('/api/loans/', { params });
    return res.data;
  },

  getOverdueLoans: async () => {
    const res = await api.get('/api/loans/overdue/');
    return res.data;
  },

  payFine: async (loanId) => {
    const res = await api.put(`/api/loans/${loanId}/fine/pay`);
    return res.data;
  },

  markLost: async (loanId) => {
    const res = await api.put(`/api/loans/${loanId}/lost`);
    return res.data;
  },
};
