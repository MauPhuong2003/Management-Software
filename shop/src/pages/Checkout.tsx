import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { shopService } from '../services/shopService';
import { 
  MapPin, 
  Store, 
  CreditCard, 
  Banknote, 
  QrCode,
  Package,
  Check,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const PROVINCES_URL = 'https://provinces.open-api.vn/api';

export const Checkout = () => {
  const navigate = useNavigate();
  const { customer } = useAuthStore();
  const { items, coupon, getCartSubtotal, clearCart } = useCartStore();

  const subtotal = getCartSubtotal();
  
  const discount = (() => {
    if (!coupon) return 0;
    if (coupon.type === 'percent') return Math.floor(subtotal * (coupon.value / 100));
    if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal);
    return 0;
  })();

  // Step state
  const [deliveryType, setDeliveryType] = useState<'shipping' | 'pickup'>('shipping');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [pickupBranch, setPickupBranch] = useState('');
  const [note, setNote] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Province / District / Ward cascades (public API)
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // Recipient info
  const [recipientName, setRecipientName] = useState(customer?.name || '');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [detailAddress, setDetailAddress] = useState('');

  // Shipping configs & branches
  const { data: shippingConfigData } = useQuery({ queryKey: ['shop-shipping-config'], queryFn: shopService.getShippingConfig });
  const { data: branchesData } = useQuery({ queryKey: ['shop-branches'], queryFn: shopService.getBranches });
  const branches = branchesData?.data || [];
  const shippingConfig = shippingConfigData?.data;

  // Calculate shipping fee
  const getShippingFee = () => {
    if (deliveryType === 'pickup') return 0;
    if (!shippingConfig) return 0;
    if (shippingConfig.mode === 'fixed') return shippingConfig.fixedFee;
    if (shippingConfig.mode === 'by_province' && selectedProvince) {
      const match = shippingConfig.provinceFees?.find((pf: any) => 
        pf.province.toLowerCase() === selectedProvince.toLowerCase()
      );
      return match ? match.fee : shippingConfig.fixedFee || 0;
    }
    return 0;
  };

  const shippingFee = getShippingFee();
  const total = Math.max(0, subtotal - discount) + shippingFee;

  // Fetch provinces on mount
  useEffect(() => {
    fetch(`${PROVINCES_URL}/?depth=1`)
      .then(res => res.json())
      .then(data => setProvinces(data || []))
      .catch(() => setProvinces([]));
  }, []);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvince(name);
    setSelectedDistrict('');
    setSelectedWard('');
    setDistricts([]);
    setWards([]);
    if (code) {
      fetch(`${PROVINCES_URL}/p/${code}?depth=2`)
        .then(res => res.json())
        .then(data => setDistricts(data.districts || []))
        .catch(() => {});
    }
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedDistrict(name);
    setSelectedWard('');
    setWards([]);
    if (code) {
      fetch(`${PROVINCES_URL}/d/${code}?depth=2`)
        .then(res => res.json())
        .then(data => setWards(data.wards || []))
        .catch(() => {});
    }
  };

  const handlePlaceOrder = async () => {
    // Validation
    if (items.length === 0) return;
    if (deliveryType === 'shipping') {
      if (!recipientName.trim() || !recipientPhone.trim() || !selectedProvince || !selectedDistrict || !selectedWard || !detailAddress.trim()) {
        alert('Vui lòng điền đầy đủ thông tin địa chỉ nhận hàng!');
        return;
      }
    } else if (deliveryType === 'pickup' && !pickupBranch) {
      alert('Vui lòng chọn chi nhánh nhận hàng!');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const payload = {
        customer: customer?._id || undefined,
        items: items.map(item => ({
          product: item.product._id,
          qty: item.qty,
          price: item.price,
          variantSku: item.variantSku || undefined,
          productName: item.product.name,
          attributes: item.selectedAttributes
        })),
        shippingAddress: deliveryType === 'shipping' ? {
          name: recipientName,
          phone: recipientPhone,
          province: selectedProvince,
          district: selectedDistrict,
          ward: selectedWard,
          detail: detailAddress
        } : undefined,
        deliveryType,
        pickupBranch: deliveryType === 'pickup' ? pickupBranch : undefined,
        paymentMethod,
        promotionCode: coupon?.code || undefined,
        discountAmount: discount,
        shippingFee,
        totalAmount: total,
        note
      };

      const result = await shopService.placeOrder(payload);
      if (result.success) {
        clearCart();
        setOrderSuccess(result.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại!');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Order Success screen
  if (orderSuccess) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto">
          <Check size={40} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-800 dark:text-white">Đặt hàng thành công!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-4 text-left space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400 font-semibold">Mã đơn hàng:</span>
            <span className="font-extrabold font-mono text-primary">{orderSuccess.orderCode}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400 font-semibold">Tổng thanh toán:</span>
            <span className="font-extrabold text-primary">{orderSuccess.totalAmount.toLocaleString()}đ</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400 font-semibold">Phương thức:</span>
            <span className="font-bold">{orderSuccess.paymentMethod === 'cash' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {customer && (
            <Link to="/account?tab=orders" className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2">
              <Package size={14}/> Xem đơn hàng của tôi
            </Link>
          )}
          <Link to="/" className="w-full py-2.5 border dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl text-xs font-bold flex items-center justify-center cursor-pointer">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <Package size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm font-bold text-gray-500">Giỏ hàng trống. Hãy thêm sản phẩm trước!</p>
        <Link to="/catalog" className="mt-4 inline-block text-primary text-xs font-bold hover:underline">Xem sản phẩm</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">Thanh toán</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Checkout form */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Delivery type selector */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Phương thức nhận hàng</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeliveryType('shipping')}
                className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                  deliveryType === 'shipping' 
                    ? 'border-primary bg-indigo-50 dark:bg-indigo-950/30' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <MapPin size={20} className={deliveryType === 'shipping' ? 'text-primary' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="text-xs font-extrabold text-gray-800 dark:text-white">Giao hàng tận nơi</p>
                  <p className="text-[10px] text-gray-400">Ship đến địa chỉ của bạn</p>
                </div>
              </button>
              <button
                onClick={() => setDeliveryType('pickup')}
                className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                  deliveryType === 'pickup' 
                    ? 'border-primary bg-indigo-50 dark:bg-indigo-950/30' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Store size={20} className={deliveryType === 'pickup' ? 'text-primary' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="text-xs font-extrabold text-gray-800 dark:text-white">Nhận tại cửa hàng</p>
                  <p className="text-[10px] text-gray-400">Miễn phí vận chuyển</p>
                </div>
              </button>
            </div>
          </div>

          {/* Shipping address form */}
          {deliveryType === 'shipping' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14}/> Địa chỉ nhận hàng
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Họ tên *</label>
                  <input 
                    type="text" value={recipientName} 
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số điện thoại *</label>
                  <input 
                    type="tel" value={recipientPhone} 
                    onChange={e => setRecipientPhone(e.target.value)}
                    placeholder="0987.654.321"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Tỉnh / Thành phố *</label>
                  <select 
                    onChange={handleProvinceChange}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="">-- Chọn tỉnh/thành --</option>
                    {provinces.map((p: any) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Quận / Huyện *</label>
                  <select 
                    onChange={handleDistrictChange}
                    disabled={districts.length === 0}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Chọn quận/huyện --</option>
                    {districts.map((d: any) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Phường / Xã *</label>
                  <select 
                    onChange={e => setSelectedWard(e.target.options[e.target.selectedIndex].text)}
                    disabled={wards.length === 0}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Chọn phường/xã --</option>
                    {wards.map((w: any) => (
                      <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Địa chỉ chi tiết (Số nhà, đường...) *</label>
                  <input 
                    type="text" value={detailAddress} 
                    onChange={e => setDetailAddress(e.target.value)}
                    placeholder="Số 123, Đường ABC, Tòa nhà XYZ..."
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pickup branch selector */}
          {deliveryType === 'pickup' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Store size={14}/> Chọn chi nhánh nhận hàng
              </h3>
              {branches.length === 0 ? (
                <p className="text-xs text-gray-400">Chưa có chi nhánh nào được thiết lập</p>
              ) : (
                <div className="space-y-2">
                  {branches.map((br: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setPickupBranch(br.address)}
                      className={`w-full text-left p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                        pickupBranch === br.address
                          ? 'border-primary bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-extrabold text-gray-800 dark:text-white">{br.branchName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={10}/>{br.address}</p>
                      {br.openingHours && <p className="text-[10px] text-gray-400 mt-0.5">Giờ mở cửa: {br.openingHours}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment method */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Phương thức thanh toán</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'cash', label: 'Tiền mặt (COD)', desc: 'Thanh toán khi nhận hàng', icon: <Banknote size={20}/> },
                { value: 'bank_transfer', label: 'Chuyển khoản', desc: 'Chuyển khoản ngân hàng / QR', icon: <QrCode size={20}/> },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value as any)}
                  className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    paymentMethod === opt.value
                      ? 'border-primary bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={paymentMethod === opt.value ? 'text-primary' : 'text-gray-400'}>{opt.icon}</span>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-gray-800 dark:text-white">{opt.label}</p>
                    <p className="text-[10px] text-gray-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Ghi chú đơn hàng</h3>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ví dụ: Giao giờ hành chính, gọi trước 30 phút..."
              rows={3}
              className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Not logged in note */}
          {!customer && (
            <div className="flex items-start gap-2.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/50 p-4 rounded-2xl">
              <AlertCircle size={16} className="text-yellow-500 shrink-0 mt-0.5"/>
              <p className="text-[11px] text-yellow-700 dark:text-yellow-400 font-semibold">
                Bạn đang đặt hàng không cần đăng nhập. <Link to="/login" className="font-extrabold underline hover:text-yellow-600">Đăng nhập</Link> để theo dõi đơn hàng dễ dàng hơn và tích điểm thành viên.
              </p>
            </div>
          )}
        </div>

        {/* Right: Order summary panel */}
        <div className="space-y-4">
          
          {/* Items preview */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Sản phẩm ({items.length})</h3>
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg shrink-0 overflow-hidden">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img src={`${API_BASE}${item.product.images[0]}`} alt="" className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16}/></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200 line-clamp-2">{item.product.name}</p>
                    <p className="text-[9px] text-gray-400 font-medium">x{item.qty} · {item.price.toLocaleString()}đ</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-primary shrink-0">{(item.price * item.qty).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Tóm tắt</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Tạm tính</span>
                <span className="font-bold">{subtotal.toLocaleString()}đ</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá ({coupon?.code})</span>
                  <span className="font-bold">-{discount.toLocaleString()}đ</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Phí vận chuyển</span>
                <span className="font-bold">{deliveryType === 'pickup' ? 'Miễn phí' : `${shippingFee.toLocaleString()}đ`}</span>
              </div>
              <div className="border-t dark:border-gray-700 pt-2 flex justify-between">
                <span className="font-black text-sm text-gray-800 dark:text-white">Tổng cộng</span>
                <span className="font-black text-base text-primary dark:text-indigo-400">{total.toLocaleString()}đ</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className="w-full py-3.5 bg-primary hover:bg-indigo-700 text-white rounded-2xl text-sm font-extrabold cursor-pointer transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPlacingOrder ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Đang xử lý...</>
              ) : (
                <>Đặt hàng ngay ({total.toLocaleString()}đ)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Checkout;
