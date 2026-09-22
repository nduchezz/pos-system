import api from './client';

export type MovementType = 'PURCHASE' | 'SALE' | 'REFUND' | 'ADJUSTMENT' | 'DAMAGE' | 'LOSS' | 'RETURN';

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: MovementType;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  product?: { id: string; name: string; sku: string; unit: string };
  user?: { id: string; name: string };
}

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  inventoryValueBuying: number;
  inventoryValueSelling: number;
  potentialProfit: number;
  lowStock: number;
  outOfStock: number;
  inStock: number;
}

export const inventoryApi = {
  summary: async () => {
    const res = await api.get('/inventory/summary');
    return res.data.data.summary as InventorySummary;
  },

  movements: async (params?: {
    productId?: string;
    movementType?: MovementType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/inventory/movements', { params });
    return {
      movements: res.data.data.movements as StockMovement[],
      pagination: res.data.data.pagination,
    };
  },

  productHistory: async (productId: string) => {
    const res = await api.get(`/inventory/movements/product/${productId}`);
    return {
      product: res.data.data.product,
      movements: res.data.data.movements as StockMovement[],
    };
  },
};
