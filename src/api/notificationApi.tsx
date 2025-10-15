import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = `${process.env.EXPO_PUBLIC_URL_CHAT}/api/notification`;

console.log('🔍 BASE_URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: { accept: '*/*' },
});

// Inject token automatically
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

// Add response interceptor to log responses and errors
api.interceptors.response.use(
  (response) => {
    // Log the actual data being returned
    console.log('✅ API Response data:', response.data);
    return response;
  },
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

export const getNotifications = (page = 1, pageSize = 15) => {
  console.log(`Fetching notifications (page: ${page}, size: ${pageSize})`);
  return api.get(`?page=${page}&pageSize=${pageSize}`);
};

export const getUnreadCount = () => {
  console.log('Fetching unread count...');
  return api.get('/unread-count');
};

export const markAllRead = () => {
  console.log('Marking all as read...');
  return api.patch('/read-all');
};

export const markOneRead = (id) => {
  console.log(`Marking notification ${id} as read...`);
  return api.patch(`/${id}/read`);
};

export const deleteNotification = (id) => {
  console.log(`Deleting notification ${id}...`);
  return api.delete(`/${id}`);
};

export const createNotification = (payload) => {
  console.log('Creating notification:', payload);
  return api.post('/', payload);
};