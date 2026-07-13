import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, CouponSlot } from '../store/cartStore';
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
  
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  const subtotal = getCartSubtotal();

  // Calculate total discount from all applied coupons
  const calcCouponDiscount = (c: any, base: number): number => {
    if (!c) return 0;
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
    const cartProductIds = items.map(i => i.product._id);

    if (promo.applyType === 'product') {
      const applicableIds = (promo.applyProductIds || []).map((p: any) => p._id || p);
      return cartProductIds.some(id => applicableIds.includes(id));
    }
    if (promo.applyType === 'buy_x_get_y') {
      const buyId = promo.buyProductId?._id || promo.buyProductId;
      const getId = promo.getProductId?._id || promo.getProductId;
      const buyItem = items.find(i => i.product._id === buyId);
      const hasGetItem = cartProductIds.includes(getId);
      return !!(buyItem && buyItem.qty >= (promo.buyQty || 1) && hasGetItem);
    }
    // 'order' and 'shipping' apply to all
    return true;
  };

  const fetchPromotions = async () => {
    setIsPromoModalOpen(true);
    setIsLoadingPromos(true);
    try {
      const res = await shopService.getActivePromotions();
      const all = res.data || [];
      // Only show promotions that can actually be applied to current cart
      const applicable = all.filter((p: any) => isPromoApplicable(p));
      setPromotions(applicable);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPromos(false);
    }
  };

  const handleSelectVoucher = async (code: string) => {
    setIsPromoModalOpen(false);
    setIsApplyingVoucher(true);
    setVoucherError('');
    try {
      const itemsPayload = items.map(item => ({
        product: item.product._id,
        qty: item.qty,
        price: item.price
      }));
      const result = await shopService.validateVoucher({ 
        code, 
        orderAmount: subtotal,
        items: itemsPayload
      });
      if (result.success) {
        applyCoupon(result.data);
        setVoucherInput('');
        alert(`Đã áp dụng mã giảm giá ${code}!`);
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
          {items.map((item, idx) => (
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
                    {item.price.toLocaleString()}đ
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
          ))}
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

      {/* PROMOTIONS SELECTIONS MODAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
              <div className="flex items-center gap-2">
                <Ticket className="text-amber-500" size={16} />
                <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Chọn mã giảm giá</h3>
              </div>
              <button 
                onClick={() => setIsPromoModalOpen(false)}
                className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-gray-500 dark:text-gray-300 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {isLoadingPromos ? (
                <div className="text-center py-6 text-xs text-gray-400">Đang tải danh sách ưu đãi...</div>
              ) : promotions.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <Ticket size={32} className="text-gray-300 dark:text-gray-600" />
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Không có ưu đãi nào áp dụng được</p>
                  <p className="text-[10px] text-gray-400 text-center max-w-xs">Các mã giảm giá hiện tại không phù hợp với sản phẩm trong giỏ hàng của bạn.</p>
                </div>
              ) : (
                promotions.map((promo: any) => {
                  const isEligible = subtotal >= promo.minOrderValue;
                  return (
                    <div 
                      key={promo._id}
                      className={`relative border rounded-xl p-3 flex justify-between items-center gap-3 overflow-hidden ${
                        isEligible 
                          ? 'bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-gray-750 dark:to-gray-700 border-indigo-150 dark:border-gray-650' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      {/* Ticket cut-outs */}
                      <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white dark:bg-gray-800 rounded-full border-r border-gray-200 dark:border-gray-700" />
                      <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white dark:bg-gray-800 rounded-full border-l border-gray-200 dark:border-gray-700" />

                      <div className="flex-1 text-left min-w-0 pl-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold text-primary dark:text-indigo-400 font-mono">
                            {promo.code}
                          </span>
                          <span className="text-[9px] text-gray-400 font-semibold">
                            (Đơn tối thiểu {promo.minOrderValue?.toLocaleString()}đ)
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-gray-800 dark:text-white mt-1">
                          Giảm {promo.type === 'percent' ? `${promo.value}%` : `${promo.value?.toLocaleString()}đ`}
                        </h4>
                        {!isEligible && (
                          <p className="text-[9px] text-red-500 font-semibold mt-1">
                            Mua thêm {(promo.minOrderValue - subtotal).toLocaleString()}đ để dùng mã này
                          </p>
                        )}
                        <p className="text-[9px] text-gray-400 mt-1">
                          Hạn dùng: {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                        </p>
                      </div>

                      <button
                        disabled={!isEligible}
                        onClick={() => handleSelectVoucher(promo.code)}
                        className={`shrink-0 py-1 px-3 rounded-lg text-[9px] font-black cursor-pointer transition-all shadow-sm ${
                          isEligible 
                            ? 'bg-primary hover:bg-indigo-700 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-450 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Áp dụng
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Cart;
