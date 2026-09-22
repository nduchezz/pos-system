import api from './client';

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export const categoriesApi = {
  list: async () => {
    const res = await api.get('/categories');
    return res.data.data.categories as Category[];
  },

  get: async (id: string) => {
    const res = await api.get(`/categories/${id}`);
    return res.data.data.category as Category;
  },

  create: async (payload: { name: string; description?: string }) => {
    const res = await api.post('/categories', payload);
    return res.data.data.category as Category;
  },

  update: async (id: string, payload: { name?: string; description?: string; status?: boolean }) => {
    const res = await api.put(`/categories/${id}`, payload);
    return res.data.data.category as Category;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
};
