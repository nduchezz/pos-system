import api from './client';

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface CreateSupplierPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export const suppliersApi = {
  list: async (params?: { search?: string }) => {
    const res = await api.get('/suppliers', { params });
    return res.data.data.suppliers as Supplier[];
  },
  get: async (id: string) => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data.data.supplier as Supplier;
  },
  create: async (payload: CreateSupplierPayload) => {
    const res = await api.post('/suppliers', payload);
    return res.data.data.supplier as Supplier;
  },
  update: async (id: string, payload: Partial<CreateSupplierPayload> & { status?: boolean }) => {
    const res = await api.put(`/suppliers/${id}`, payload);
    return res.data.data.supplier as Supplier;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  },
};
