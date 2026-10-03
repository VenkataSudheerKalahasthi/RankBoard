import axios from 'axios';

let authTokenGetter = null;

export const setAuthTokenGetter = (getter) => {
  authTokenGetter = getter;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request interceptor to attach Clerk JWT token
api.interceptors.request.use(
  async (config) => {
    if (authTokenGetter) {
      try {
        const token = await authTokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn('Could not retrieve Clerk token for request:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
