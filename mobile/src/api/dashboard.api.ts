import api from './client';

export interface DashboardData {
  today: {
    totalSales: number;
    grossRevenue: number;
    totalItemsSold: number;
    cogs: number;
    grossProfit: number;
    byPaymentMethod: Record<string, number>;
    expenses: number;
    netProfit: number;
  };
  inventory: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    inventoryValue: number;
  };
}

export interface ChartPoint {
  label: string;
  value: number;
  sortKey: string;
}

export const dashboardApi = {
  get: async () => {
    const res = await api.get('/dashboard');
    return res.data.data as DashboardData;
  },
  chart: async (period: 'today' | 'week' | 'month' = 'week') => {
    const res = await api.get('/dashboard/chart', { params: { period } });
    return res.data.data.data as ChartPoint[];
  },
};
