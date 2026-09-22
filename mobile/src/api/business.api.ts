import api from './client';

export interface BusinessFull {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string | null;
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
  taxIncluded: boolean;
  receiptFooter: string | null;
}

export const businessApi = {
  get: async () => {
    const res = await api.get('/business');
    return res.data.data.business as BusinessFull;
  },
  update: async (payload: Partial<BusinessFull>) => {
    const res = await api.put('/business', payload);
    return res.data.data.business as BusinessFull;
  },
};
