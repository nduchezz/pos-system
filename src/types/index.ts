export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier';
  businessId: string;
  phone?: string;
  status?: boolean;
}

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address?: string;
  currency: string;
  taxRate: number;
  taxIncluded: boolean;
  receiptFooter?: string;
  logo?: string;
  createdAt: any;
}

export interface Product {
  id: string;
  businessId: string;
  categoryId?: string;
  supplierId?: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStock: number;
  unit: string;
  image?: string;
  status: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  status: boolean;
  createdAt: any;
}

export interface Sale {
  id: string;
  businessId: string;
  userId: string;
  customerId?: string;
  receiptNo: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: 'completed' | 'refunded' | 'cancelled' | 'pending';
  paymentMethod: string;
  amountReceived: number;
  change: number;
  createdAt: any;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  buyingPrice: number;
  discount: number;
  subtotal: number;
}

export interface CartItem extends SaleItem {
  id: string;
  stockQuantity: number;
}