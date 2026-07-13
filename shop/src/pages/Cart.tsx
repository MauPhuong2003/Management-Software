import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
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
  Ticket
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, coupon, applyCoupon, removeCoupon, getCartSubtotal } = useCartStore();
  
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  const subtotal = getCartSubtotal();

  // Calculate discount based on coupon type
  const calculateDiscount = () => {
    if (!coupon) return 0;
    if (coupon.type === 'percent') return Math.floor(subtotal * (coupon.value / 100));
    if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal);
    return 0;
  };

  const discount = calculateDiscount();
  const total = Math.max(0, subtotal - discount);

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsApplyingVoucher(true);
    setVoucherError('');

    try {
      const result = await shopService.validateVoucher({ code: voucherInput.trim().toUpperCase(), orderAmount: subtotal });
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
                    <img src={`${API_BASE}${item.product.images[0]}`} alt={item.product.name} className="w-full h-full object-cover" />
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
          
          {/* Voucher Box */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Ticket size={14} /> Mã giảm giá
            </h3>
            
            {coupon ? (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-xs font-extrabold text-green-700 dark:text-green-400 font-mono">{coupon.code}</p>
                  <p className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">
                    Giảm {coupon.type === 'percent' ? `${coupon.value}%` : `${coupon.value.toLocaleString()}đ`}
                  </p>
                </div>
                <button onClick={removeCoupon} className="text-red-400 hover:text-red-600 cursor-pointer p-1"><X size={14}/></button>
              </div>
            ) : (
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
            )}
          </div>

          {/* Order summary */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Tóm tắt đơn hàng</h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Tạm tính ({items.reduce((s, i) => s + i.qty, 0)} sản phẩm)</span>
                <span className="font-bold">{subtotal.toLocaleString()}đ</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1"><Tag size={12}/> Giảm giá ({coupon?.code})</span>
                  <span className="font-bold">-{discount.toLocaleString()}đ</span>
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
    </div>
  );
};
export default Cart;
