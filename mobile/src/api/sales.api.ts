import api from './client';

export type PaymentMethod = 'CASH' | 'MPESA' | 'CARD' | 'BANK' | 'CREDIT';
export type SaleStatus = 'COMPLETED' | 'REFUNDED' | 'CANCELLED' | 'PENDING';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  discount: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  phoneNumber: string | null;
  status: string;
}

export interface Sale {
  id: string;
  receiptNo: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  change: number;
  notes: string | null;
  createdAt: string;
  items: SaleItem[];
  payments: Payment[];
  customer?: { id: string; name: string; phone?: string | null } | null;
  user?: { id: string; name: string };
}

export interface CreateSalePayload {
  items: Array<{
    productId: string;
    quantity: number;
    discount: number;
  }>;
  customerId?: string | null;
  cartDiscount: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  paymentReference?: string;
  paymentPhone?: string;
  notes?: string;
}

export const salesApi = {
  create: async (payload: CreateSalePayload) => {
    const res = await api.post('/sales', payload);
    return res.data.data.sale as Sale;
  },

  list: async (params?: { page?: number; limit?: number; status?: SaleStatus }) => {
    const res = await api.get('/sales', { params });
    return res.data.data.sales as Sale[];
  },

  get: async (id: string) => {
    const res = await api.get(`/sales/${id}`);
    return res.data.data.sale as Sale;
  },
};
