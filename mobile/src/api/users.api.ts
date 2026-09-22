import api from './client';

export type UserRole = 'ADMIN' | 'CASHIER';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  status: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
}

export const usersApi = {
  list: async () => {
    const res = await api.get('/users');
    return res.data.data.users as AppUser[];
  },
  create: async (payload: CreateUserPayload) => {
    const res = await api.post('/users', payload);
    return res.data.data.user as AppUser;
  },
  update: async (id: string, payload: Partial<Omit<CreateUserPayload, 'password' | 'email'>> & { status?: boolean }) => {
    const res = await api.put(`/users/${id}`, payload);
    return res.data.data.user as AppUser;
  },
  changePassword: async (id: string, newPassword: string) => {
    await api.put(`/users/${id}/password`, { newPassword });
  },
  delete: async (id: string) => {
    await api.delete(`/users/${id}`);
  },
};
