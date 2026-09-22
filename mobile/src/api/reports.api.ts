import api from './client';

export interface SalesReport {
  period: { from: string; to: string };
  summary: {
    totalSales: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    discounts: number;
    tax: number;
    itemsSold: number;
    avgSaleValue: number;
  };
  byPaymentMethod: Record<string, { count: number; amount: number }>;
  daily: Array<{ date: string; revenue: number; count: number }>;
}

export interface ProductStat {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  cogs: number;
  profit: number;
}

export interface ProductsReport {
  period: { from: string; to: string };
  bestSelling: ProductStat[];
  mostProfitable: ProductStat[];
  slowMoving: ProductStat[];
}

export interface InventoryReport {
  summary: {
    totalProducts: number;
    totalBuyingValue: number;
    totalSellingValue: number;
    potentialProfit: number;
    lowStock: number;
    outOfStock: number;
  };
  products: Array<{
    id: string; name: string; sku: string; category: string | null;
    stockQuantity: number; minStock: number; unit: string;
    buyingPrice: number; sellingPrice: number;
    buyingValue: number; sellingValue: number;
    status: 'OK' | 'LOW' | 'OUT';
  }>;
}

export const reportsApi = {
  sales: async (params?: { from?: string; to?: string }) => {
    const res = await api.get('/reports/sales', { params });
    return res.data.data as SalesReport;
  },
  products: async (params?: { from?: string; to?: string }) => {
    const res = await api.get('/reports/products', { params });
    return res.data.data as ProductsReport;
  },
  inventory: async () => {
    const res = await api.get('/reports/inventory');
    return res.data.data as InventoryReport;
  },
};
