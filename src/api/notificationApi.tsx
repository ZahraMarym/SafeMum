import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = `${process.env.EXPO_PUBLIC_URL_CHAT}/api/notification`;

console.log('🔍 BASE_URL:', BASE_URL); // Debug log

const api = axios.create({
  baseURL: BASE_URL,
  headers: { accept: '*/*' },
});

// inject token automatically
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🌐 API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to log errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// ----------------------- REST ENDPOINTS -----------------------

export const getNotifications = (page = 1, pageSize = 15) =>
  api.get(`?page=${page}&pageSize=${pageSize}`);

export const getUnreadCount = () => api.get('/unread-count');

export const markAllRead = () => api.patch('/read-all');

export const markOneRead = (id) => api.patch(`/${id}/read`);

export const deleteNotification = (id) => api.delete(`/${id}`);

export const createNotification = (payload) => api.post('/', payload);