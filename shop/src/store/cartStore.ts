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
  price: number;
  selectedAttributes: { key: string; value: string }[];
}

export type CouponSlot = 'order' | 'product' | 'shipping' | 'buy_x_get_y';

export interface CouponsState {
  order: any | null;
  product: any | null;
  shipping: any | null;
  buy_x_get_y: any | null;
}

interface CartState {
  items: CartItem[];
  coupons: CouponsState;
  coupon: any | null; // legacy compat — first applied coupon
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, variantSku: string | null, qty: number) => void;
  removeItem: (productId: string, variantSku: string | null) => void;
  clearCart: () => void;
  applyCoupon: (voucher: any) => void;
  removeCoupon: (type?: CouponSlot) => void;
  getAppliedCoupons: () => any[];
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

const emptyCoupons = (): CouponsState => ({
  order: null,
  product: null,
  shipping: null,
  buy_x_get_y: null,
});

export const useCartStore = create<CartState>((set, get) => ({
  items: loadCartItems(),
  coupons: emptyCoupons(),
  coupon: null, // overridden below as computed getter via selector pattern

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
    set({ items: [], coupons: emptyCoupons(), coupon: null });
  },

  // applyCoupon auto-detects applyType and puts voucher in the right slot
  applyCoupon: (voucher) => {
    const type: CouponSlot = voucher.applyType || 'order';
    set((state) => {
      const newCoupons = { ...state.coupons, [type]: voucher };
      const firstApplied = newCoupons.order || newCoupons.product || newCoupons.shipping || newCoupons.buy_x_get_y || null;
      return { coupons: newCoupons, coupon: firstApplied };
    });
  },

  // removeCoupon(type) removes specific slot; removeCoupon() clears all
  removeCoupon: (type?: CouponSlot) => {
    if (type) {
      set((state) => {
        const newCoupons = { ...state.coupons, [type]: null };
        const firstApplied = newCoupons.order || newCoupons.product || newCoupons.shipping || newCoupons.buy_x_get_y || null;
        return { coupons: newCoupons, coupon: firstApplied };
      });
    } else {
      set({ coupons: emptyCoupons(), coupon: null });
    }
  },

  // Returns array of all currently applied coupons
  getAppliedCoupons: () => {
    const c = get().coupons;
    return [c.order, c.product, c.shipping, c.buy_x_get_y].filter(Boolean);
  },

  getCartSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  getCartTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0);
  }
}));


