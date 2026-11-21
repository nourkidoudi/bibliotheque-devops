import axios from 'axios';

// Le token d'accès vit UNIQUEMENT en mémoire (jamais dans localStorage) :
// un script injecté (XSS) ne peut plus le lire dans le stockage du navigateur.
// Le refresh token est dans un cookie HttpOnly géré par le navigateur.
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

const api = axios.create({
  baseURL: '',
  withCredentials: true, // envoie le cookie HttpOnly sur /api/auth/*
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Un seul refresh à la fois, même si plusieurs requêtes reçoivent 401 simultanément
let refreshPromise = null;
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh-token', null, { withCredentials: true })
      .then((res) => {
        const token = res.data.data?.accessToken || res.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/api/auth/login') &&
      !originalRequest.url.includes('/api/auth/refresh-token')
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
