import api from './client';

export type PaymentMethod = 'CASH' | 'MPESA' | 'CARD' | 'BANK' | 'CREDIT';

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  paymentMethod: PaymentMethod;
  date: string;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface CreateExpensePayload {
  category: string;
  amount: number;
  description?: string;
  paymentMethod: PaymentMethod;
  date?: string;
}

export const expensesApi = {
  list: async (params?: { from?: string; to?: string; category?: string }) => {
    const res = await api.get('/expenses', { params });
    return {
      expenses: res.data.data.expenses as Expense[],
      total: res.data.data.total as number,
    };
  },
  create: async (payload: CreateExpensePayload) => {
    const res = await api.post('/expenses', payload);
    return res.data.data.expense as Expense;
  },
  update: async (id: string, payload: Partial<CreateExpensePayload>) => {
    const res = await api.put(`/expenses/${id}`, payload);
    return res.data.data.expense as Expense;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/expenses/${id}`);
    return res.data;
  },
};
