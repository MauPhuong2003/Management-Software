import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import type { CouponSlot } from '../store/cartStore';
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
  AlertCircle,
  Ticket,
  X,
  Tag,
  Gift,
  Truck,
  Crown,
  Star,
  Sparkles
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';
const PROVINCES_URL = 'https://provinces.open-api.vn/api';

const VOUCHER_TYPES: { type: CouponSlot; label: string; icon: any; color: string }[] = [
  { type: 'order',       label: 'Đơn hàng',   icon: Tag,    color: 'text-indigo-500' },
  { type: 'product',     label: 'Sản phẩm',   icon: Gift,   color: 'text-pink-500'   },
  { type: 'shipping',    label: 'Vận chuyển',  icon: Truck,  color: 'text-teal-500'   },
  { type: 'buy_x_get_y', label: 'Mua X/Y',    icon: Crown,  color: 'text-amber-500'  },
];

export const Checkout = () => {
  const location = useLocation();
  const { customer } = useAuthStore();
  const { data: profileRes } = useQuery({ 
    queryKey: ['shop-profile'], 
    queryFn: shopService.getProfile, 
    enabled: !!customer 
  });
  const freshCustomer = profileRes?.data || customer;
  const { items: cartItems, coupons, applyCoupon, removeCoupon, getAppliedCoupons, getCartSubtotal, clearCart } = useCartStore();

  const buyNowItem = location.state?.buyNowItem;
  const items = buyNowItem ? [buyNowItem] : cartItems;
  const subtotal = buyNowItem ? (buyNowItem.price * buyNowItem.qty) : getCartSubtotal();

  const [voucherInput, setVoucherInput] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // Promotions selector modal state
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);

  // Check if a promo is applicable to current cart items
  const isPromoApplicable = (promo: any): boolean => {
    const cartProductIds = items.map((i: any) => i.product._id || i.product);

    if (promo.applyType === 'product') {
      const applicableIds = (promo.applyProductIds || []).map((p: any) => p._id || p);
      return cartProductIds.some((id: string) => applicableIds.includes(id));
    }
    if (promo.applyType === 'buy_x_get_y') {
      const buyId = promo.buyProductId?._id || promo.buyProductId;
      const getId = promo.getProductId?._id || promo.getProductId;
      const buyItem = items.find((i: any) => (i.product._id || i.product) === buyId);
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
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể áp dụng mã giảm giá này');
    } finally {
      setIsApplyingVoucher(false);
    }
  };
  
  // Multi-coupon discount calculation
  const calcCouponDiscount = (c: any, base: number): number => {
    if (!c) return 0;
    if (c.type === 'percent') {
      const raw = Math.floor(base * (c.value / 100));
      return c.maxDiscountAmount ? Math.min(raw, c.maxDiscountAmount) : raw;
    }
    if (c.type === 'fixed') return Math.min(c.value, base);
    return 0;
  };

  // Loyalty config query for tier discount
  const { data: loyaltyRes } = useQuery({ queryKey: ['loyalty-config'], queryFn: () => shopService.getLoyaltyConfig() });
  const loyaltyConfig = loyaltyRes?.data;

  // Find customer's current tier config (by name first, fallback to points)
  const customerTierConfig = (() => {
    if (!freshCustomer || !loyaltyConfig?.tiers) return null;
    const byName = loyaltyConfig.tiers.find((t: any) => t.name.toLowerCase() === freshCustomer.tier.toLowerCase());
    if (byName) return byName;
    const sorted = [...loyaltyConfig.tiers].sort((a: any, b: any) => b.minPoints - a.minPoints);
    return sorted.find((t: any) => (freshCustomer.loyaltyPoints || 0) >= t.minPoints) || null;
  })();

  const customerTierDiscount = customerTierConfig?.discountPercent || 0;

  const orderDiscount    = calcCouponDiscount(coupons.order, subtotal);
  const productDiscount  = calcCouponDiscount(coupons.product, subtotal);
  const buyXYDiscount    = calcCouponDiscount(coupons.buy_x_get_y, subtotal);
  const tierDiscountAmt  = customerTierDiscount > 0 ? Math.floor(subtotal * (customerTierDiscount / 100)) : 0;
  const voucherDiscount  = orderDiscount + productDiscount + buyXYDiscount;
  const discount = voucherDiscount + tierDiscountAmt;

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
  const [recipientPhone, setRecipientPhone] = useState(customer?.phone || '');
  const [addressType, setAddressType] = useState<'Sau sáp nhập' | 'Trước sáp nhập'>('Sau sáp nhập');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [detailAddress, setDetailAddress] = useState('');

  // Fetch saved addresses from customer profile
  const { data: addressesRes } = useQuery({ queryKey: ['shop-addresses'], queryFn: shopService.getAddresses });
  const savedAddresses = addressesRes?.data || [];
  const [selectedSavedAddrId, setSelectedSavedAddrId] = useState<string>('');

  // OSM street autocomplete suggestions
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Set default address if it exists
  useEffect(() => {
    if (savedAddresses.length > 0) {
      const defaultAddr = savedAddresses.find((a: any) => a.isDefault) || savedAddresses[0];
      if (defaultAddr) {
        setSelectedSavedAddrId(defaultAddr._id);
        setRecipientName(defaultAddr.name);
        setRecipientPhone(defaultAddr.phone);
        setAddressType(defaultAddr.addressType === 'Trước sáp nhập' ? 'Trước sáp nhập' : 'Sau sáp nhập');
        setSelectedProvince(defaultAddr.province);
        setSelectedDistrict(defaultAddr.district);
        setSelectedWard(defaultAddr.ward);
        setDetailAddress(defaultAddr.detail);
      }
    }
  }, [savedAddresses]);

  // OSM street suggestion query
  useEffect(() => {
    if (addressType === 'Sau sáp nhập' && (!selectedProvince || !selectedDistrict || !selectedWard)) {
      setStreetSuggestions([]);
      return;
    }
    if (!detailAddress || detailAddress.trim().length < 2) {
      setStreetSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingStreets(true);
      try {
        const queryParts = [];
        if (detailAddress.trim()) queryParts.push(detailAddress.trim());
        if (selectedWard) queryParts.push(selectedWard);
        if (selectedDistrict) queryParts.push(selectedDistrict);
        if (selectedProvince) queryParts.push(selectedProvince);

        const q = queryParts.join(', ');
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=vn&limit=10`;
        
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'vi,en;q=0.9',
            'User-Agent': 'WebBanHangShopApp/1.0'
          }
        });
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const suggestions: string[] = [];
          data.forEach((item: any) => {
            const road = item.address?.road || item.address?.pedestrian;
            if (road && !suggestions.includes(road)) {
              suggestions.push(road);
            }
            const name = item.name;
            if (name && !suggestions.includes(name) && (item.class === 'highway' || item.type === 'residential' || item.type === 'tertiary')) {
              suggestions.push(name);
            }
          });
          setStreetSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } else {
          setStreetSuggestions([]);
        }
      } catch (error) {
        console.error("OSM street suggestions error:", error);
        setStreetSuggestions([]);
      } finally {
        setLoadingStreets(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [detailAddress, selectedWard, selectedDistrict, selectedProvince, addressType]);

  const handleSavedAddressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const addrId = e.target.value;
    setSelectedSavedAddrId(addrId);
    if (!addrId) {
      setRecipientName(customer?.name || '');
      setRecipientPhone(customer?.phone || '');
      setAddressType('Sau sáp nhập');
      setSelectedProvince('');
      setSelectedDistrict('');
      setSelectedWard('');
      setDetailAddress('');
      return;
    }
    const addr = savedAddresses.find((a: any) => a._id === addrId);
    if (addr) {
      setRecipientName(addr.name);
      setRecipientPhone(addr.phone);
      setAddressType(addr.addressType === 'Trước sáp nhập' ? 'Trước sáp nhập' : 'Sau sáp nhập');
      setSelectedProvince(addr.province);
      setSelectedDistrict(addr.district);
      setSelectedWard(addr.ward);
      setDetailAddress(addr.detail);
    }
  };

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

  // Expected loyalty points to earn
  const expectedPoints = (() => {
    if (!freshCustomer || !loyaltyConfig || !loyaltyConfig.isActive) return 0;
    const vndPerPoint = loyaltyConfig.vndToEarnOnePoint || 100000;
    const multiplier = customerTierConfig?.pointMultiplier || 1;
    return Math.floor((total / vndPerPoint) * multiplier);
  })();

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
        promotionCodes: getAppliedCoupons().map((c: any) => c.code).filter(Boolean),
        discountAmount: discount,
        tierDiscountAmount: tierDiscountAmt,
        shippingFee,
        totalAmount: total,
        note
      };

      const result = await shopService.placeOrder(payload);
      if (result.success) {
        if (!buyNowItem) {
          clearCart();
        }
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

              {/* Saved Address Selector */}
              {savedAddresses.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Sử dụng địa chỉ đã lưu</label>
                  <select
                    value={selectedSavedAddrId}
                    onChange={handleSavedAddressChange}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-indigo-50/50 dark:bg-indigo-950/20 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="">-- Nhập địa chỉ mới / khác --</option>
                    {savedAddresses.map((addr: any) => (
                      <option key={addr._id} value={addr._id}>
                        {addr.label ? `[${addr.label}] ` : ''}{addr.name} - {addr.phone} ({[addr.detail, addr.ward, addr.district, addr.province].filter(Boolean).join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pre-merger vs Post-merger selector */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Loại địa chỉ hành chính *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-200">
                      <input
                        type="radio"
                        name="checkoutAddressType"
                        checked={addressType === 'Sau sáp nhập'}
                        onChange={() => {
                          setAddressType('Sau sáp nhập');
                          setSelectedProvince('');
                          setSelectedDistrict('');
                          setSelectedWard('');
                          setSelectedSavedAddrId('');
                        }}
                        className="cursor-pointer font-bold"
                      />
                      Sau sáp nhập (Hiện tại / Mới)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-200">
                      <input
                        type="radio"
                        name="checkoutAddressType"
                        checked={addressType === 'Trước sáp nhập'}
                        onChange={() => {
                          setAddressType('Trước sáp nhập');
                          setSelectedProvince('');
                          setSelectedDistrict('');
                          setSelectedWard('');
                          setSelectedSavedAddrId('');
                        }}
                        className="cursor-pointer font-bold"
                      />
                      Trước sáp nhập (Cũ / Lịch sử)
                    </label>
                  </div>
                </div>

                {/* Recipient Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Họ tên người nhận *</label>
                  <input 
                    type="text" value={recipientName} 
                    onChange={e => { setRecipientName(e.target.value); setSelectedSavedAddrId(''); }}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số điện thoại *</label>
                  <input 
                    type="tel" value={recipientPhone} 
                    onChange={e => { setRecipientPhone(e.target.value); setSelectedSavedAddrId(''); }}
                    placeholder="0987.654.321"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Province */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Tỉnh / Thành phố *</label>
                  {addressType === 'Sau sáp nhập' ? (
                    <select 
                      value={provinces.find(p => p.name === selectedProvince)?.code || ''}
                      onChange={handleProvinceChange}
                      className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                    >
                      <option value="">-- Chọn tỉnh/thành --</option>
                      {provinces.map((p: any) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" value={selectedProvince}
                      onChange={e => { setSelectedProvince(e.target.value); setSelectedSavedAddrId(''); }}
                      placeholder="Thành phố Hồ Chí Minh"
                      className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>

                {/* District */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Quận / Huyện *</label>
                  {addressType === 'Sau sáp nhập' ? (
                    <select 
                      value={districts.find(d => d.name === selectedDistrict)?.code || ''}
                      onChange={handleDistrictChange}
                      disabled={districts.length === 0}
                      className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Chọn quận/huyện --</option>
                      {districts.map((d: any) => (
                        <option key={d.code} value={d.code}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" value={selectedDistrict}
                      onChange={e => { setSelectedDistrict(e.target.value); setSelectedSavedAddrId(''); }}
                      placeholder="Quận 2, Quận 9..."
                      className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>

                {/* Ward */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Phường / Xã *</label>
                  {addressType === 'Sau sáp nhập' ? (
                    <select 
                      value={wards.find(w => w.name === selectedWard)?.code || ''}
                      onChange={e => {
                        const name = e.target.options[e.target.selectedIndex].text;
                        setSelectedWard(name);
                      }}
                      disabled={wards.length === 0}
                      className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Chọn phường/xã --</option>
                      {wards.map((w: any) => (
                        <option key={w.code} value={w.code}>{w.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" value={selectedWard}
                      onChange={e => { setSelectedWard(e.target.value); setSelectedSavedAddrId(''); }}
                      placeholder="Phường Long Bình..."
                      className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>

                {/* Detail Address with OSM Autocomplete */}
                <div className="space-y-1.5 relative sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase flex justify-between items-center">
                    <span>Địa chỉ chi tiết (Số nhà, đường...) *</span>
                    {loadingStreets && <span className="text-[9px] text-primary animate-pulse normal-case font-normal">Đang tìm đường...</span>}
                  </label>
                  <input 
                    type="text" value={detailAddress} 
                    onChange={e => {
                      setDetailAddress(e.target.value);
                      setSelectedSavedAddrId('');
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (streetSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Số 12, Đường Nguyễn Huệ..."
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />

                  {/* Suggestions List */}
                  {showSuggestions && streetSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                      {streetSuggestions.map((st, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setDetailAddress(st);
                            setShowSuggestions(false);
                            setSelectedSavedAddrId('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-gray-700 dark:text-gray-200 cursor-pointer font-medium block truncate"
                        >
                          📍 {st}
                        </button>
                      ))}
                    </div>
                  )}
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
                      <img src={item.product.images[0]?.startsWith('http') ? item.product.images[0] : `${API_BASE}${item.product.images[0]}`} alt="" className="w-full h-full object-cover"/>
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

            {/* Per-type applied coupon slots */}
            <div className="space-y-1.5">
              {VOUCHER_TYPES.map(({ type, label, icon: Icon, color }) => {
                const applied = coupons[type];
                return (
                  <div key={type} className={`rounded-xl border px-3 py-2 flex items-center gap-2.5 transition-all ${
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
                      <button onClick={() => removeCoupon(type)} className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0 text-[10px] font-bold">
                        Gỡ bỏ
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tier discount badge */}
            {customer && customerTierDiscount > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 flex items-center gap-2">
                <Star size={13} className="text-amber-500" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Hạng {customer.tier}: </span>
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300">Giảm thêm {customerTierDiscount}% đơn hàng</span>
                </div>
              </div>
            )}

            {/* Manual input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã ưu đãi..."
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
                <button
                  disabled={isApplyingVoucher || !voucherInput.trim()}
                  onClick={handleApplyVoucher}
                  className="px-4 bg-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Áp dụng
                </button>
              </div>
              {voucherError && (
                <p className="text-[10px] text-red-500 font-bold text-left flex items-center gap-1">
                  <AlertCircle size={10} /> {voucherError}
                </p>
              )}
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
              {orderDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Tag size={10}/> Giảm đơn ({coupons.order?.code})</span>
                  <span className="font-bold">-{orderDiscount.toLocaleString()}đ</span>
                </div>
              )}
              {productDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Gift size={10}/> Giảm SP ({coupons.product?.code})</span>
                  <span className="font-bold">-{productDiscount.toLocaleString()}đ</span>
                </div>
              )}
              {buyXYDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Crown size={10}/> Mua X/Y ({coupons.buy_x_get_y?.code})</span>
                  <span className="font-bold">-{buyXYDiscount.toLocaleString()}đ</span>
                </div>
              )}
              {freshCustomer && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1"><Star size={10}/> Hạng {freshCustomer.tier} ({customerTierDiscount}%)</span>
                  <span className="font-bold">-{tierDiscountAmt.toLocaleString()}đ</span>
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
              {expectedPoints > 0 && (
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400 pt-1.5 border-t border-dashed dark:border-gray-750">
                  <span className="flex items-center gap-1"><Sparkles size={10}/> Điểm tích luỹ dự kiến</span>
                  <span className="font-extrabold text-xs">+{expectedPoints.toLocaleString()} điểm</span>
                </div>
              )}
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
                  <p className="text-[10px] text-gray-400 text-center max-w-xs">Các mã giảm giá hiện tại không phù hợp với sản phẩm trong đơn hàng của bạn.</p>
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
                      <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white dark:bg-gray-850 rounded-full border-r border-gray-200 dark:border-gray-700" />
                      <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white dark:bg-gray-855 rounded-full border-l border-gray-200 dark:border-gray-700" />

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
export default Checkout;
