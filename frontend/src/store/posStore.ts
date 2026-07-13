import { create } from 'zustand';

interface POSItem {
  product: any;
  variant?: any;
  qty: number;
  price: number;
}

export interface OrderSession {
  id: string;
  name: string;
  cart: POSItem[];
  customer: any | null;
  paymentMethod: string;
  note: string;
}

interface POSState {
  sessions: OrderSession[];
  activeSessionId: string;
  
  // Shortcuts for the active session (reactive for components)
  cart: POSItem[];
  customer: any | null;
  paymentMethod: string;
  note: string;

  addSession: () => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;

  addToCart: (product: any, variant?: any, qty?: number) => void;
  removeFromCart: (productId: string, variantSku?: string | null) => void;
  updateQty: (productId: string, variantSku: string | null, qty: number) => void;
  setCustomer: (customer: any) => void;
  setPaymentMethod: (method: string) => void;
  setNote: (note: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

const createSession = (name: string): OrderSession => ({
  id: 'session-' + Math.random().toString(36).substring(2, 9),
  name,
  cart: [],
  customer: null,
  paymentMethod: 'cash',
  note: '',
});

const defaultSession = createSession('Đơn 1');

export const usePosStore = create<POSState>((set, get) => {
  const updateActiveSession = (updater: Partial<OrderSession>) => {
    const { sessions, activeSessionId } = get();
    const updatedSessions = sessions.map(s => 
      s.id === activeSessionId ? { ...s, ...updater } : s
    );
    set({
      ...updater,
      sessions: updatedSessions
    } as any);
  };

  return {
    sessions: [defaultSession],
    activeSessionId: defaultSession.id,
    
    cart: defaultSession.cart,
    customer: defaultSession.customer,
    paymentMethod: defaultSession.paymentMethod,
    note: defaultSession.note,

    addSession: () => {
      const { sessions } = get();
      let counter = 1;
      let name = `Đơn ${counter}`;
      while (sessions.some(s => s.name === name)) {
        counter++;
        name = `Đơn ${counter}`;
      }
      const newSession = createSession(name);
      set({
        sessions: [...sessions, newSession],
        activeSessionId: newSession.id,
        cart: newSession.cart,
        customer: newSession.customer,
        paymentMethod: newSession.paymentMethod,
        note: newSession.note
      });
    },

    removeSession: (id) => {
      const { sessions, activeSessionId } = get();
      if (sessions.length <= 1) return;

      const updatedSessions = sessions.filter(s => s.id !== id);
      
      let nextActiveId = activeSessionId;
      if (activeSessionId === id) {
        const deletedIndex = sessions.findIndex(s => s.id === id);
        const nextIndex = deletedIndex === sessions.length - 1 ? deletedIndex - 1 : deletedIndex + 1;
        nextActiveId = sessions[nextIndex].id;
      }

      const nextSession = updatedSessions.find(s => s.id === nextActiveId)!;

      set({
        sessions: updatedSessions,
        activeSessionId: nextSession.id,
        cart: nextSession.cart,
        customer: nextSession.customer,
        paymentMethod: nextSession.paymentMethod,
        note: nextSession.note
      });
    },

    setActiveSession: (id) => {
      const { sessions } = get();
      const nextSession = sessions.find(s => s.id === id);
      if (!nextSession) return;

      set({
        activeSessionId: nextSession.id,
        cart: nextSession.cart,
        customer: nextSession.customer,
        paymentMethod: nextSession.paymentMethod,
        note: nextSession.note
      });
    },

    addToCart: (product, variant = null, qty = 1) => {
      const cart = get().cart;
      const itemKey = product._id + '-' + (variant?.sku || 'default');
      const existing = cart.find(i => (i.product._id + '-' + (i.variant?.sku || 'default')) === itemKey);
      let newCart;
      if (existing) {
        newCart = cart.map(i => (i.product._id + '-' + (i.variant?.sku || 'default')) === itemKey ? { ...i, qty: i.qty + qty } : i);
      } else {
        newCart = [...cart, { product, variant, qty, price: variant ? variant.price : product.priceSale }];
      }
      updateActiveSession({ cart: newCart });
    },

    removeFromCart: (productId, variantSku = null) => {
      const itemKey = productId + '-' + (variantSku || 'default');
      const newCart = get().cart.filter(i => (i.product._id + '-' + (i.variant?.sku || 'default')) !== itemKey);
      updateActiveSession({ cart: newCart });
    },

    updateQty: (productId, variantSku, qty) => {
      const itemKey = productId + '-' + (variantSku || 'default');
      if (qty <= 0) return get().removeFromCart(productId, variantSku);
      const newCart = get().cart.map(i => (i.product._id + '-' + (i.variant?.sku || 'default')) === itemKey ? { ...i, qty } : i);
      updateActiveSession({ cart: newCart });
    },

    setCustomer: (customer) => {
      updateActiveSession({ customer });
    },

    setPaymentMethod: (paymentMethod) => {
      updateActiveSession({ paymentMethod });
    },

    setNote: (note) => {
      updateActiveSession({ note });
    },

    clearCart: () => {
      updateActiveSession({
        cart: [],
        customer: null,
        note: ''
      });
    },

    getTotal: () => get().cart.reduce((total, item) => total + (item.price * item.qty), 0)
  };
});
