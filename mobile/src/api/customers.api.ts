import api from './client';

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit: number;
  outstandingBalance: number;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { sales: number };
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
}

export const customersApi = {
  list: async (params?: { search?: string }) => {
    const res = await api.get('/customers', { params });
    return res.data.data.customers as Customer[];
  },
  get: async (id: string) => {
    const res = await api.get(`/customers/${id}`);
    return res.data.data.customer as Customer;
  },
  create: async (payload: CreateCustomerPayload) => {
    const res = await api.post('/customers', payload);
    return res.data.data.customer as Customer;
  },
  update: async (id: string, payload: Partial<CreateCustomerPayload> & { status?: boolean }) => {
    const res = await api.put(`/customers/${id}`, payload);
    return res.data.data.customer as Customer;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
};
