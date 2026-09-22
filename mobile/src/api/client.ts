import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔴 CHANGE THIS to your PC's LAN IP (run: hostname -I)
const API_BASE_URL = 'http://192.168.1.150:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@pos_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['@pos_token', '@pos_user', '@pos_business']);
    }
    return Promise.reject(error);
  }
);

export default api;
