import api from './client';
import { AuthResponse, User } from '../types';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data as AuthResponse;
  },
  register: async (payload: {
    businessName: string; ownerName: string; email: string;
    password: string; phone: string; address?: string;
  }) => {
    const res = await api.post('/auth/register', payload);
    return res.data.data as AuthResponse;
  },
  me: async () => {
    const res = await api.get('/auth/me');
    return res.data.data.user as User;
  },
};
