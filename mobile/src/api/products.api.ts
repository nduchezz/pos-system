import api from './client';

export type Unit = 'PIECE' | 'BOX' | 'PACKET' | 'KILOGRAM' | 'GRAM' | 'LITRE' | 'BOTTLE' | 'METRE';

export interface Product {
  id: string;
  businessId: string;
  categoryId?: string | null;
  supplierId?: string | null;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStock: number;
  unit: Unit;
  image?: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string | null;
  description?: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStock: number;
  unit: Unit;
}

export const productsApi = {
  list: async (params?: { search?: string; categoryId?: string; lowStock?: boolean }) => {
    const res = await api.get('/products', { params });
    return res.data.data.products as Product[];
  },

  get: async (id: string) => {
    const res = await api.get(`/products/${id}`);
    return res.data.data.product as Product;
  },

  create: async (payload: CreateProductPayload) => {
    const res = await api.post('/products', payload);
    return res.data.data.product as Product;
  },

  update: async (id: string, payload: Partial<CreateProductPayload> & { status?: boolean }) => {
    const res = await api.put(`/products/${id}`, payload);
    return res.data.data.product as Product;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },

  adjustStock: async (id: string, payload: { quantity: number; movementType: string; reason?: string }) => {
    const res = await api.patch(`/products/${id}/stock`, payload);
    return res.data.data.product as Product;
  },

  lowStock: async () => {
    const res = await api.get('/products/low-stock');
    return res.data.data.products as Product[];
  },
};
