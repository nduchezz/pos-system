export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  businessId: string;
  phone?: string;
  status: boolean;
}

export interface Business {
  id: string;
  name: string;
  ownerName?: string;
  currency: string;
  taxRate?: number;
  taxIncluded?: boolean;
  taxEnabled?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  business: Business;
}
