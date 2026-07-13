import { create } from 'zustand';

export interface CartItem {
  product: {
    _id: string;
    name: string;
    sku: string;
    images: string[];
    priceSale: number;
    priceCompare: number;
  };
  variantSku: string | null;
  qty: number;
  price: number; // variant price or priceSale
  selectedAttributes: { key: string; value: string }[];
}

interface CartState {
  items: CartItem[];
  coupon: any | null;
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, variantSku: string | null, qty: number) => void;
  removeItem: (productId: string, variantSku: string | null) => void;
  clearCart: () => void;
  applyCoupon: (voucher: any) => void;
  removeCoupon: () => void;
  getCartSubtotal: () => number;
  getCartTotalItems: () => number;
}

const loadCartItems = (): CartItem[] => {
  try {
    return JSON.parse(localStorage.getItem('shop_cart') || '[]');
  } catch {
    return [];
  }
};

export const useCartStore = create<CartState>((set, get) => ({
  items: loadCartItems(),
  coupon: null,

  addItem: (newItem) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => 
          item.product._id === newItem.product._id && 
          item.variantSku === newItem.variantSku
      );

      let updatedItems;
      if (existingIndex !== -1) {
        updatedItems = [...state.items];
        updatedItems[existingIndex].qty += newItem.qty;
      } else {
        updatedItems = [...state.items, newItem];
      }

      localStorage.setItem('shop_cart', JSON.stringify(updatedItems));
      return { items: updatedItems };
    });
  },

  updateQty: (productId, variantSku, qty) => {
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if (item.product._id === productId && item.variantSku === variantSku) {
          return { ...item, qty: Math.max(1, qty) };
        }
        return item;
      });
      localStorage.setItem('shop_cart', JSON.stringify(updatedItems));
      return { items: updatedItems };
    });
  },

  removeItem: (productId, variantSku) => {
    set((state) => {
      const updatedItems = state.items.filter(
        (item) => !(item.product._id === productId && item.variantSku === variantSku)
      );
      localStorage.setItem('shop_cart', JSON.stringify(updatedItems));
      return { items: updatedItems };
    });
  },

  clearCart: () => {
    localStorage.removeItem('shop_cart');
    set({ items: [], coupon: null });
  },

  applyCoupon: (voucher) => {
    set({ coupon: voucher });
  },

  removeCoupon: () => {
    set({ coupon: null });
  },

  getCartSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  getCartTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0);
  }
}));
