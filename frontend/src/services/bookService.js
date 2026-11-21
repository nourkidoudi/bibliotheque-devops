import api from './api';

export const bookService = {
  getBooks: async (params) => {
    const res = await api.get('/api/books/', { params });
    return res.data;
  },

  getFeaturedBooks: async () => {
    const res = await api.get('/api/books/featured');
    return res.data;
  },

  getBookById: async (id) => {
    const res = await api.get(`/api/books/${id}`);
    return res.data;
  },

  createBook: async (data) => {
    const res = await api.post('/api/books', data);
    return res.data;
  },

  updateBook: async (id, data) => {
    const res = await api.put(`/api/books/${id}`, data);
    return res.data;
  },

  deleteBook: async (id) => {
    const res = await api.delete(`/api/books/${id}`);
    return res.data;
  },

  addReview: async (id, reviewData) => {
    const res = await api.post(`/api/books/${id}/reviews`, reviewData);
    return res.data;
  },

  getCategories: async () => {
    const res = await api.get('/api/categories/');
    return res.data;
  },

  uploadCover: async (bookId, file) => {
    const formData = new FormData();
    formData.append('cover', file);
    const res = await api.post(`/api/books/upload-cover/${bookId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
