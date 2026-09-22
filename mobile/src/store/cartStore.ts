import { create } from 'zustand';
import { Product } from '../api/products.api';

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  buyingPrice: number;
  quantity: number;
  discount: number;       // per-item discount (flat amount)
  stockQuantity: number;  // current stock from server
}

interface CartState {
  items: CartItem[];
  cartDiscount: number;   // flat amount discount on the whole cart
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  incrementQty: (productId: string) => void;
  decrementQty: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, discount: number) => void;
  setCartDiscount: (amount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTaxable: () => number;
  getTotal: (taxRate?: number) => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  cartDiscount: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        // Increment quantity if stock allows
        if (existing.quantity >= product.stockQuantity) {
          return state;
        }
        return {
          ...state,
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      // New item
      if (product.stockQuantity <= 0) return state;
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        sellingPrice: product.sellingPrice,
        buyingPrice: product.buyingPrice,
        quantity: 1,
        discount: 0,
        stockQuantity: product.stockQuantity,
      };
      return { ...state, items: [...state.items, newItem] };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      ...state,
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  incrementQty: (productId) => {
    set((state) => ({
      ...state,
      items: state.items.map((i) =>
        i.productId === productId && i.quantity < i.stockQuantity
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ),
    }));
  },

  decrementQty: (productId) => {
    set((state) => ({
      ...state,
      items: state.items
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0),
    }));
  },

  setQuantity: (productId, quantity) => {
    set((state) => ({
      ...state,
      items: state.items
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(Math.max(1, quantity), i.stockQuantity) }
            : i
        )
        .filter((i) => i.quantity > 0),
    }));
  },

  setItemDiscount: (productId, discount) => {
    set((state) => ({
      ...state,
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, discount } : i
      ),
    }));
  },

  setCartDiscount: (amount) => set({ cartDiscount: amount }),

  clearCart: () => set({ items: [], cartDiscount: 0 }),

  getSubtotal: () => {
    return get().items.reduce(
      (sum, i) => sum + i.sellingPrice * i.quantity - i.discount,
      0
    );
  },

  getTotalDiscount: () => {
    const itemDiscounts = get().items.reduce((sum, i) => sum + i.discount, 0);
    return itemDiscounts + get().cartDiscount;
  },

  getTaxable: () => {
    return Math.max(0, get().getSubtotal() - get().cartDiscount);
  },

  getTotal: (taxRate = 0) => {
    const taxable = get().getTaxable();
    const tax = (taxable * taxRate) / 100;
    return taxable + tax;
  },

  getItemCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },
}));
