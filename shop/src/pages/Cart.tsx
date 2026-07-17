import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import type { CouponSlot } from '../store/cartStore';
import { shopService } from '../services/shopService';
import { 
  Trash2, 
  ShoppingBag, 
  Minus, 
  Plus,
  Tag,
  X,
  Package,
  ArrowRight,
  Ticket,
  Crown,
  Truck,
  Gift
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const VOUCHER_TYPES: { type: CouponSlot; label: string; icon: any; color: string }[] = [
  { type: 'order',       label: 'Đơn hàng',   icon: Tag,    color: 'text-indigo-500' },
  { type: 'product',     label: 'Sản phẩm',   icon: Gift,   color: 'text-pink-500'   },
  { type: 'shipping',    label: 'Vận chuyển',  icon: Truck,  color: 'text-teal-500'   },
  { type: 'buy_x_get_y', label: 'Mua X/Y',    icon: Crown,  color: 'text-amber-500'  },
];

export const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, coupons, applyCoupon, removeCoupon, getAppliedCoupons, getCartSubtotal } = useCartStore();
  const appliedCoupons = getAppliedCoupons();
  
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  const subtotal = getCartSubtotal();

  // Combine cart items with auto-gifted items from Buy X Get Y voucher
  const giftItem = useMemo(() => {
    const c = coupons.buy_x_get_y;
    if (!c) return null;
    const buyProdId = (c.buyProductId?._id || c.buyProductId)?.toString();
    const getProdId = (c.getProductId?._id || c.getProductId)?.toString();
    const buyItem = items.find((i: any) => (i.product?._id || i.product)?.toString() === buyProdId);
    const getItem = items.find((i: any) => (i.product?._id || i.product)?.toString() === getProdId);
    
    if (getItem) return null;
    if (!buyItem || buyItem.qty < (c.buyQty || 1)) return null;

    const giftProduct = c.giftProduct?.product || (typeof c.getProductId === 'object' ? c.getProductId : null);
    if (!giftProduct) return null;

    let multiplier = 1;
    if (c.isRecursive) {
      multiplier = Math.floor(buyItem.qty / (c.buyQty || 1));
    }

    return {
      product: giftProduct,
      variantSku: giftProduct.sku || null,
      qty: multiplier,
      price: 0,
      isGift: true,
      giftNote: 'Sản phẩm này được tặng kèm'
    };
  }, [coupons.buy_x_get_y, items]);

  const displayItems = giftItem ? [...items, giftItem] : items;

  // Calculate total discount from all applied coupons
  const calcCouponDiscount = (c: any, base: number): number => {
    if (!c) return 0;
    if (c.applyType === 'buy_x_get_y') {
      if (c.calculatedDiscount !== undefined) return c.calculatedDiscount;
      const buyProdId = (c.buyProductId?._id || c.buyProductId)?.toString();
      const getProdId = (c.getProductId?._id || c.getProductId)?.toString();
      const buyItem = items.find((i: any) => (i.product?._id || i.product)?.toString() === buyProdId);
      const getItem = items.find((i: any) => (i.product?._id || i.product)?.toString() === getProdId);
      if (!buyItem || !getItem) return 0;
      const buyQtyNeeded = c.buyQty || 1;
      if (buyItem.qty < buyQtyNeeded) return 0;
      let multiplier = 1;
      if (c.isRecursive) {
        multiplier = Math.floor(buyItem.qty / buyQtyNeeded);
      }
      const yPercent = c.discountYValue || c.value || 0;
      const singleYDiscount = Math.floor(((getItem.price || 0) * yPercent) / 100);
      const eligibleYQty = Math.min(getItem.qty, multiplier);
      return singleYDiscount * eligibleYQty;
    }
    if (c.type === 'percent') {
      const raw = Math.floor(base * (c.value / 100));
      return c.maxDiscountAmount ? Math.min(raw, c.maxDiscountAmount) : raw;
    }
    if (c.type === 'fixed') return Math.min(c.value, base);
    return 0;
  };

  const orderDiscount   = calcCouponDiscount(coupons.order, subtotal);
  const productDiscount = calcCouponDiscount(coupons.product, subtotal);
  const shippingDiscount = calcCouponDiscount(coupons.shipping, 30000); // estimated
  const buyXYDiscount   = calcCouponDiscount(coupons.buy_x_get_y, subtotal);
  const discount = orderDiscount + productDiscount + buyXYDiscount;
  const total = Math.max(0, subtotal - discount);

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsApplyingVoucher(true);
    setVoucherError('');

    try {
      const itemsPayload = items.map(item => ({
        product: item.product._id,
        qty: item.qty,
        price: item.price
      }));
      const result = await shopService.validateVoucher({ 
        code: voucherInput.trim().toUpperCase(), 
        orderAmount: subtotal,
        items: itemsPayload
      });
      if (result.success) {
        applyCoupon(result.data);
        setVoucherInput('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ';
      setVoucherError(msg);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  // Promotions browser state
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);

  // Check if a promo is applicable to current cart items
  const isPromoApplicable = (promo: any): boolean => {
    if (!promo) return false;
    const cartProductIds = items.map((i: any) => (i.product?._id || i.product)?.toString());

    if (promo.applyType === 'product') {
      const applicableIds = (promo.applyProductIds || []).map((p: any) => (p._id || p)?.toString());
      if (applicableIds.length === 0) return true;
      return cartProductIds.some((id: string) => applicableIds.includes(id));
    }
    if (promo.applyType === 'buy_x_get_y') {
      const buyId = (promo.buyProductId?._id || promo.buyProductId)?.toString();
      const getId = (promo.getProductId?._id || promo.getProductId)?.toString();
      if (!buyId || !getId) return true;
      const buyItem = items.find((i: any) => (i.product?._id || i.product)?.toString() === buyId);
      const hasGetItem = cartProductIds.includes(getId);
      return !!(buyItem && buyItem.qty >= (promo.buyQty || 1) && hasGetItem);
    }
    return true;
  };

  const fetchPromotions = async () => {
    setIsPromoModalOpen(true);
    setIsLoadingPromos(true);
    try {
      const res = await shopService.getActivePromotions();
      setPromotions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPromos(false);
    }
  };

  // Toggle voucher: Click selected voucher to unselect; click unselected to replace in category slot (does NOT close modal!)
  const handleToggleVoucher = async (promo: any) => {
    const slotType: CouponSlot = promo.applyType || 'order';
    const currentSelectedInSlot = coupons[slotType];

    if (currentSelectedInSlot && currentSelectedInSlot.code === promo.code) {
      removeCoupon(slotType);
      return;
    }

    setIsApplyingVoucher(true);
    setVoucherError('');
    try {
      const itemsPayload = items.map((item: any) => ({
        product: item.product._id || item.product,
        qty: item.qty,
        price: item.price
      }));
      const result = await shopService.validateVoucher({ 
        code: promo.code, 
        orderAmount: subtotal,
        items: itemsPayload
      });
      if (result.success) {
        applyCoupon(result.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể áp dụng mã giảm giá này');
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-4">
        <ShoppingBag size={60} className="opacity-20" />
        <p className="text-sm font-bold">Giỏ hàng đang trống</p>
        <p className="text-xs font-medium">Hãy thêm sản phẩm để tiếp tục mua sắm</p>
        <Link to="/catalog" className="bg-primary hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all mt-2">
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">
          Giỏ hàng ({items.length} sản phẩm)
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Cart items list */}
        <div className="lg:col-span-2 space-y-4">
          {displayItems.map((item: any, idx: number) => {  const getProdId = (coupons.buy_x_get_y?.getProductId?._id || coupons.buy_x_get_y?.getProductId)?.toString();
  const isThisItemGift = item.isGift || (coupons.buy_x_get_y && (item.product?._id || item.product)?.toString() === getProdId);
  return (
            <div key={`${item.product._id}-${item.variantSku}-${idx}`} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 flex gap-4 items-start">
              
              {/* Product image */}
              <Link to={`/product/${item.product._id}`} className="shrink-0">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-750 rounded-xl border dark:border-gray-700 overflow-hidden">
                  {item.product.images && item.product.images.length > 0 ? (
                    <img src={item.product.images[0]?.startsWith('http') ? item.product.images[0] : `${API_BASE}${item.product.images[0]}`} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={28}/></div>
                  )}
                </div>
              </Link>

              {/* Product info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <Link to={`/product/${item.product._id}`} className="text-sm font-bold text-gray-800 dark:text-white hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {item.product.name}
                    </Link>
                    {/* Selected attributes / variant label */}
                    {item.selectedAttributes && item.selectedAttributes.length > 0 && (
                      <p className="text-[10px] text-gray-400 font-medium mt-1">
                        {item.selectedAttributes.map(a => `${a.key}: ${a.value}`).join(' | ')}
                      </p>
                    )}
                    {item.variantSku && (
                      <p className="text-[9px] font-mono text-gray-300 mt-0.5">{item.variantSku}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.product._id, item.variantSku)}
                    className="text-red-400 hover:text-red-600 cursor-pointer p-1 shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Price & Qty controls row */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-extrabold text-primary dark:text-indigo-400">
                    {isThisItemGift ? '0đ' : `${item.price.toLocaleString()}đ`}
                  </span>
                  
                  <div className="flex items-center gap-2 border dark:border-gray-600 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQty(item.product._id, item.variantSku, item.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-bold">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.product._id, item.variantSku, item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Line subtotal */}
                <div className="text-right text-xs text-gray-400 font-semibold">
                  Thành tiền: <span className="font-extrabold text-gray-700 dark:text-white">{(item.price * item.qty).toLocaleString()}đ</span>
                </div>
              </div>
            </div>
          ); })}
        </div>

        {/* Right: Order Summary & Voucher */}
        <div className="space-y-4">
          
          {/* Voucher Box — 4 slots */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Ticket size={14} /> Ưu đãi
              </h3>
              <button
                onClick={fetchPromotions}
                className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer bg-transparent border-none outline-none"
              >
                Chọn ưu đãi
              </button>
            </div>

            {/* Applied coupons per slot */}
            <div className="space-y-2">
              {VOUCHER_TYPES.map(({ type, label, icon: Icon, color }) => {
                const applied = coupons[type];
                return (
                  <div key={type} className={`rounded-xl border px-3 py-2 flex items-center gap-2.5 ${
                    applied
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700 opacity-60'
                  }`}>
                    <Icon size={13} className={applied ? 'text-green-600 dark:text-green-400' : color} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{label}: </span>
                      {applied ? (
                        <span className="text-[10px] font-extrabold text-green-700 dark:text-green-300 font-mono">{applied.code}</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Chưa áp dụng</span>
                      )}
                    </div>
                    {applied && (
                      <button onClick={() => removeCoupon(type)} className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0">
                        <X size={12}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Manual input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã voucher..."
                  value={voucherInput}
                  onChange={e => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
                <button
                  onClick={handleApplyVoucher}
                  disabled={isApplyingVoucher || !voucherInput.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isApplyingVoucher ? '...' : 'Áp dụng'}
                </button>
              </div>
              {voucherError && <p className="text-[10px] font-bold text-red-500">{voucherError}</p>}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Tóm tắt đơn hàng</h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Tạm tính ({items.reduce((s, i) => s + i.qty, 0)} sản phẩm)</span>
                <span className="font-bold">{subtotal.toLocaleString()}đ</span>
              </div>
              
              {orderDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Tag size={12}/> Giảm đơn ({coupons.order?.code})</span>
                  <span className="font-bold">-{orderDiscount.toLocaleString()}đ</span>
                </div>
              )}
              {productDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Gift size={12}/> Giảm SP ({coupons.product?.code})</span>
                  <span className="font-bold">-{productDiscount.toLocaleString()}đ</span>
                </div>
              )}
              {buyXYDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Crown size={12}/> Mua X/Y ({coupons.buy_x_get_y?.code})</span>
                  <span className="font-bold">-{buyXYDiscount.toLocaleString()}đ</span>
                </div>
              )}
              {shippingDiscount > 0 && (
                <div className="flex justify-between text-teal-600 dark:text-teal-400">
                  <span className="flex items-center gap-1"><Truck size={12}/> Giảm ship ({coupons.shipping?.code})</span>
                  <span className="font-bold">-{shippingDiscount.toLocaleString()}đ</span>
                </div>
              )}
              
              <div className="flex justify-between text-gray-400 text-[10px]">
                <span>Phí vận chuyển</span>
                <span className="font-semibold">Tính ở bước tiếp theo</span>
              </div>

              <div className="border-t dark:border-gray-700 pt-2.5 flex justify-between">
                <span className="font-black text-sm text-gray-800 dark:text-white">Tổng cộng</span>
                <span className="font-black text-base text-primary dark:text-indigo-400">{total.toLocaleString()}đ</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3 bg-primary hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              Tiếp tục thanh toán <ArrowRight size={14}/>
            </button>
            
            <Link
              to="/catalog"
              className="w-full py-2.5 border dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>

      </div>

      {/* PROMOTIONS SELECTIONS MODAL (SHOPEE STYLE) */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-left">
            {/* Modal Header */}
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
              <div className="flex items-center gap-2">
                <Ticket className="text-orange-500" size={18} />
                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">Chọn Shopee Voucher / Ưu đãi</h3>
              </div>
              <button 
                onClick={() => setIsPromoModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-gray-500 dark:text-gray-300 cursor-pointer border-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Top Code Input & Apply Bar */}
            <div className="p-3 bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700 flex gap-2">
              <input 
                type="text" 
                placeholder="Nhập mã voucher ưu đãi..." 
                value={voucherInput} 
                onChange={e => setVoucherInput(e.target.value.toUpperCase())}
                className="flex-1 px-3.5 py-2 border border-gray-200 dark:border-gray-650 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 text-gray-800 dark:text-white uppercase outline-none focus:border-orange-500 font-mono"
              />
              <button 
                onClick={() => { handleApplyVoucher(); setIsPromoModalOpen(false); }}
                disabled={!voucherInput.trim() || isApplyingVoucher}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-black border-0 cursor-pointer transition-all shadow-sm"
              >
                Áp dụng
              </button>
            </div>

            {/* Modal Content - Categorized Shopee Sections */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
              {isLoadingPromos ? (
                <div className="text-center py-10 text-xs font-bold text-gray-400">Đang tải danh sách ưu đãi...</div>
              ) : promotions.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <Ticket size={36} className="text-gray-300 dark:text-gray-600" />
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Không có ưu đãi nào</p>
                  <p className="text-[10px] text-gray-400 text-center max-w-xs">Hiện tại chưa có khuyến mãi nào trên hệ thống.</p>
                </div>
              ) : (
                <>
                  {/* Section 1: 🚚 Ưu đãi phí vận chuyển */}
                  {promotions.filter(p => p.applyType === 'shipping').length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5 border-b dark:border-gray-700 pb-1.5">
                        🚚 Ưu đãi phí vận chuyển
                      </h4>
                      <div className="space-y-2.5">
                        {promotions.filter(p => p.applyType === 'shipping').map((promo: any) => {
                          const isSelected = coupons.shipping?.code === promo.code;
                          const isEligible = subtotal >= (promo.minOrderValue || 0);

                          return (
                            <div 
                              key={promo._id}
                              onClick={() => handleToggleVoucher(promo)}
                              className={`relative border-2 rounded-2xl flex items-stretch overflow-hidden cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 shadow-sm'
                                  : isEligible 
                                    ? 'border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300' 
                                    : 'border-gray-150 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80'
                              }`}
                            >
                              {/* Ticket Cutouts */}
                              <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-r border-gray-200 dark:border-gray-700 z-10" />
                              <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-l border-gray-200 dark:border-gray-700 z-10" />

                              {/* Left Ticket Badge */}
                              <div className="w-24 bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex flex-col items-center justify-center p-2 shrink-0 border-r border-dashed border-white/40">
                                <span className="text-[10px] font-black uppercase tracking-wider">FREE SHIP</span>
                                <span className="text-[8px] font-extrabold text-white/80 uppercase mt-0.5">Mã vận chuyển</span>
                              </div>

                              {/* Right Details */}
                              <div className="flex-1 p-3 min-w-0 flex items-center justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded">
                                      {promo.code}
                                    </span>
                                    {promo.isPersonalVoucher && (
                                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                        🎯 Quà MiniGame
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-black text-gray-800 dark:text-white line-clamp-1">{promo.name}</h5>
                                  <p className="text-[9px] text-gray-400 font-medium">Đơn tối thiểu {promo.minOrderValue?.toLocaleString()}đ</p>
                                  {!isEligible && (
                                    <p className="text-[9px] text-red-500 font-bold">Mua thêm {(promo.minOrderValue - subtotal).toLocaleString()}đ</p>
                                  )}
                                </div>

                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 2: 🏷️ Mã giảm giá & Ưu đãi đơn hàng */}
                  {promotions.filter(p => p.applyType === 'order' || !p.applyType).length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5 border-b dark:border-gray-700 pb-1.5">
                        🏷️ Mã giảm giá / Ưu đãi đơn hàng
                      </h4>
                      <div className="space-y-2.5">
                        {promotions.filter(p => p.applyType === 'order' || !p.applyType).map((promo: any) => {
                          const isSelected = coupons.order?.code === promo.code;
                          const isEligible = subtotal >= (promo.minOrderValue || 0);

                          return (
                            <div 
                              key={promo._id}
                              onClick={() => handleToggleVoucher(promo)}
                              className={`relative border-2 rounded-2xl flex items-stretch overflow-hidden cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-sm'
                                  : isEligible 
                                    ? 'border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300' 
                                    : 'border-gray-150 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80'
                              }`}
                            >
                              {/* Ticket Cutouts */}
                              <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-r border-gray-200 dark:border-gray-700 z-10" />
                              <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-l border-gray-200 dark:border-gray-700 z-10" />

                              {/* Left Ticket Badge */}
                              <div className="w-24 bg-gradient-to-br from-orange-500 to-red-600 text-white flex flex-col items-center justify-center p-2 shrink-0 border-r border-dashed border-white/40">
                                <span className="text-xs font-black">
                                  {promo.type === 'percent' ? `GIẢM ${promo.value}%` : `${Math.floor(promo.value / 1000)}k`}
                                </span>
                                <span className="text-[8px] font-extrabold text-white/80 uppercase mt-0.5">Mã đơn hàng</span>
                              </div>

                              {/* Right Details */}
                              <div className="flex-1 p-3 min-w-0 flex items-center justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black font-mono text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-1.5 py-0.5 rounded">
                                      {promo.code}
                                    </span>
                                    {promo.isPersonalVoucher && (
                                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                        🎯 Quà MiniGame
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-black text-gray-800 dark:text-white line-clamp-1">{promo.name}</h5>
                                  <p className="text-[9px] text-gray-400 font-medium">Đơn tối thiểu {promo.minOrderValue?.toLocaleString()}đ</p>
                                  {!isEligible && (
                                    <p className="text-[9px] text-red-500 font-bold">Mua thêm {(promo.minOrderValue - subtotal).toLocaleString()}đ</p>
                                  )}
                                </div>

                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 3: 📦 Ưu đãi sản phẩm */}
                  {promotions.filter(p => p.applyType === 'product').length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b dark:border-gray-700 pb-1.5">
                        📦 Ưu đãi sản phẩm
                      </h4>
                      <div className="space-y-2.5">
                        {promotions.filter(p => p.applyType === 'product').map((promo: any) => {
                          const isSelected = coupons.product?.code === promo.code;
                          const isEligible = subtotal >= (promo.minOrderValue || 0);

                          return (
                            <div 
                              key={promo._id}
                              onClick={() => handleToggleVoucher(promo)}
                              className={`relative border-2 rounded-2xl flex items-stretch overflow-hidden cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm'
                                  : isEligible 
                                    ? 'border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300' 
                                    : 'border-gray-150 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80'
                              }`}
                            >
                              {/* Ticket Cutouts */}
                              <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-r border-gray-200 dark:border-gray-700 z-10" />
                              <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-l border-gray-200 dark:border-gray-700 z-10" />

                              {/* Left Ticket Badge */}
                              <div className="w-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex flex-col items-center justify-center p-2 shrink-0 border-r border-dashed border-white/40">
                                <span className="text-[10px] font-black uppercase">SẢN PHẨM</span>
                                <span className="text-[8px] font-extrabold text-white/80 uppercase mt-0.5">Mã sản phẩm</span>
                              </div>

                              {/* Right Details */}
                              <div className="flex-1 p-3 min-w-0 flex items-center justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                                      {promo.code}
                                    </span>
                                    {promo.isPersonalVoucher && (
                                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                        🎯 Quà MiniGame
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-black text-gray-800 dark:text-white line-clamp-1">{promo.name}</h5>
                                  <p className="text-[9px] text-gray-400 font-medium">Đơn tối thiểu {promo.minOrderValue?.toLocaleString()}đ</p>
                                </div>

                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 4: 🎁 Ưu đãi Mua X Tặng Y */}
                  {promotions.filter(p => p.applyType === 'buy_x_get_y').length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 border-b dark:border-gray-700 pb-1.5">
                        🎁 Ưu đãi Mua X Tặng Y
                      </h4>
                      <div className="space-y-2.5">
                        {promotions.filter(p => p.applyType === 'buy_x_get_y').map((promo: any) => {
                          const buyProdId = (promo.buyProductId?._id || promo.buyProductId)?.toString();
                          const getProdId = (promo.getProductId?._id || promo.getProductId)?.toString();

                          const buyItem = items.find((i: any) => (i.product?._id || i.product)?.toString() === buyProdId);
                          const getItem = items.find((i: any) => (i.product?._id || i.product)?.toString() === getProdId);

                          const hasBuyItem = !!(buyItem && buyItem.qty >= (promo.buyQty || 1));
                          const hasGetItem = !!getItem;

                          const isSelected = coupons.buy_x_get_y?.code === promo.code;
                          const isReady = hasBuyItem && hasGetItem && (subtotal >= (promo.minOrderValue || 0));

                          return (
                            <div 
                              key={promo._id}
                              onClick={() => handleToggleVoucher(promo)}
                              className={`relative border-2 rounded-2xl flex items-stretch overflow-hidden cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-sm'
                                  : isReady 
                                    ? 'border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-rose-300' 
                                    : 'border-gray-150 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90'
                              }`}
                            >
                              {/* Ticket Cutouts */}
                              <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-r border-gray-200 dark:border-gray-700 z-10" />
                              <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-gray-50 dark:bg-gray-900 rounded-full border-l border-gray-200 dark:border-gray-700 z-10" />

                              {/* Left Ticket Badge */}
                              <div className="w-24 bg-gradient-to-br from-rose-500 to-pink-600 text-white flex flex-col items-center justify-center p-2 shrink-0 border-r border-dashed border-white/40">
                                <span className="text-[10px] font-black uppercase">QUÀ TẶNG</span>
                                <span className="text-[8px] font-extrabold text-white/80 uppercase mt-0.5">Mua X/Y</span>
                              </div>

                              {/* Right Details */}
                              <div className="flex-1 p-3 min-w-0 flex items-center justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                                      {promo.code}
                                    </span>
                                    {promo.isPersonalVoucher && (
                                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                        🎯 Quà MiniGame
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-black text-gray-800 dark:text-white line-clamp-1">{promo.name}</h5>
                                  
                                  <p className="text-[10px] text-gray-600 dark:text-gray-300 font-medium">
                                    🛒 Mua {promo.buyQty || 1} <span className="font-bold text-rose-600 dark:text-rose-400">{promo.buyProductId?.name || 'Sản phẩm X'}</span>
                                  </p>
                                  <p className="text-[10px] text-gray-600 dark:text-gray-300 font-medium">
                                    🎁 Giảm {promo.discountYValue || promo.value || 100}% <span className="font-bold text-emerald-600 dark:text-emerald-400">{promo.getProductId?.name || 'Sản phẩm Y'}</span>
                                  </p>

                                  {!hasBuyItem && (
                                    <p className="text-[9px] text-red-500 font-bold mt-0.5">
                                      ⚠️ Cần mua ít nhất {promo.buyQty || 1} {promo.buyProductId?.name || 'SP điều kiện (X)'}
                                    </p>
                                  )}
                                  {!hasGetItem && (
                                    <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                      💡 Vui lòng thêm "{promo.getProductId?.name || 'SP nhận ưu đãi (Y)'}" vào giỏ hàng
                                    </p>
                                  )}
                                </div>

                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Shopee-style Bottom Confirmation Bar */}
            <div className="p-3.5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between gap-3 shrink-0">
              <div className="text-left text-xs min-w-0">
                {appliedCoupons.length > 0 ? (
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Mã đã chọn ({appliedCoupons.length}):</span>
                    <span className="font-black text-orange-600 dark:text-orange-400 font-mono text-sm truncate block">
                      {appliedCoupons.map((c: any) => c.code).join(', ')}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Chưa chọn voucher nào</span>
                )}
              </div>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl border-0 cursor-pointer shadow-md transition-all active:scale-95 uppercase tracking-wider shrink-0"
              >
                ĐỒNG Ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
