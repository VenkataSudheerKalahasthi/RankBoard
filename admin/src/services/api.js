import axios from 'axios';

let getAuthToken = null;

export const setAuthTokenGetter = (tokenGetter) => {
  getAuthToken = tokenGetter;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    if (getAuthToken) {
      try {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn('[Admin API Interceptor]: Failed to retrieve Clerk token', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.message || error.message || 'An error occurred during API request.';
    return Promise.reject({
      ...error,
      message: errorMsg,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default api;
