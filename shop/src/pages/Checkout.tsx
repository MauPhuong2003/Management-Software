import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import type { CouponSlot } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { shopService } from '../services/shopService';
import { 
  MapPin, 
  Store, 
  Banknote, 
  QrCode,
  Package,
  Check,
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
  const appliedCoupons = getAppliedCoupons();

  const buyNowItem = location.state?.buyNowItem;
  const items = buyNowItem ? [buyNowItem] : cartItems;
  const subtotal = buyNowItem ? (buyNowItem.price * buyNowItem.qty) : getCartSubtotal();

  // Combine checkout items with auto-gifted items from Buy X Get Y voucher
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

  const [voucherInput, setVoucherInput] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // Promotions selector modal state
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
  const { data: settingsData } = useQuery({ queryKey: ['shop-settings'], queryFn: shopService.getSettings });
  const branches = branchesData?.data || [];
  const shippingConfig = shippingConfigData?.data;
  const storeSettings = settingsData?.data || {};

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
  const shippingDiscount = (() => {
    const c = coupons.shipping;
    if (!c || deliveryType === 'pickup') return 0;
    if (c.type === 'percent') {
      const raw = Math.floor(shippingFee * (c.value / 100));
      return c.maxDiscountAmount ? Math.min(raw, c.maxDiscountAmount) : raw;
    }
    if (c.type === 'fixed') return Math.min(c.value, shippingFee);
    // Voucher loại free ship (không có type) -> giảm toàn bộ
    if (!c.type || c.type === 'freeship') return shippingFee;
    return 0;
  })();
  const netShippingFee = Math.max(0, shippingFee - shippingDiscount);
  const total = Math.max(0, subtotal - discount) + netShippingFee;

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
        items: displayItems.map((item: any) => {
          const getProdIdForGift = (coupons.buy_x_get_y?.getProductId?._id || coupons.buy_x_get_y?.getProductId)?.toString();
          const isGift = item.isGift || (coupons.buy_x_get_y && (item.product?._id || item.product)?.toString() === getProdIdForGift);
          return {
            product: item.product._id || item.product,
            qty: item.qty,
            price: isGift ? 0 : item.price,
            variantSku: item.variantSku || null,
            productName: item.product.name,
            attributes: item.selectedAttributes || [],
            isGift: !!isGift,
            giftNote: isGift ? 'Sản phẩm này được tặng kèm' : ''
          };
        }),
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
        discountAmount: discount + shippingDiscount,
        tierDiscountAmount: tierDiscountAmt,
        shippingFee: netShippingFee,
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
        {orderSuccess.paymentMethod === 'bank_transfer' && storeSettings.bankInfo?.accountNumber && (
          <div className="bg-indigo-50/30 dark:bg-gray-800/50 border border-indigo-100/50 dark:border-gray-700 rounded-2xl p-5 text-left space-y-4">
            <h4 className="font-extrabold text-gray-800 dark:text-white text-[11px] uppercase tracking-wider text-center border-b dark:border-gray-700 pb-2 flex items-center justify-center gap-1.5">
              💸 Hướng dẫn chuyển khoản ngân hàng
            </h4>
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-40 bg-white p-2 rounded-2xl border dark:border-gray-750 flex items-center justify-center shrink-0 shadow-sm">
                <img 
                  src={`https://img.vietqr.io/image/${storeSettings.bankInfo.bankName.replace(/\s+/g, '')}-${storeSettings.bankInfo.accountNumber}-compact2.png?amount=${orderSuccess.totalAmount}&addInfo=${orderSuccess.orderCode}&accountName=${encodeURIComponent(storeSettings.bankInfo.accountHolder)}`} 
                  alt="VietQR Payment Code" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="space-y-2 text-xs w-full">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Ngân hàng:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{storeSettings.bankInfo.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Số tài khoản:</span>
                  <span className="font-mono font-bold text-primary">{storeSettings.bankInfo.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Chủ tài khoản:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{storeSettings.bankInfo.accountHolder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Số tiền:</span>
                  <span className="font-extrabold text-primary">{orderSuccess.totalAmount.toLocaleString()}đ</span>
                </div>
                
                <div className="flex justify-between items-center bg-white dark:bg-gray-750 border dark:border-gray-700 p-2.5 rounded-xl mt-2">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Nội dung chuyển khoản</p>
                    <p className="font-mono font-extrabold text-primary text-xs">{orderSuccess.orderCode}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(orderSuccess.orderCode);
                      alert('Đã sao chép nội dung chuyển khoản!');
                    }}
                    className="px-2.5 py-1.5 bg-primary text-white font-bold rounded-lg text-[10px] cursor-pointer hover:bg-indigo-700 transition-colors border-0 outline-none"
                  >
                    Sao chép
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 text-center italic">Vui lòng quét mã QR hoặc chuyển khoản đúng số tài khoản, số tiền và nội dung chuyển khoản ở trên để đơn hàng được duyệt nhanh nhất.</p>
          </div>
        )}

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
                      onClick={() => setPickupBranch(br.branchName)}
                      className={`w-full text-left p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                        pickupBranch === br.branchName
                          ? 'border-primary bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-gray-800 dark:text-white">{br.branchName}</p>
                          <p className="text-[10px] text-gray-450 dark:text-gray-400 mt-1 flex items-center gap-1 leading-relaxed"><MapPin size={10} className="shrink-0" />{br.address}</p>
                          {br.openingHours && <p className="text-[10px] text-gray-400 mt-1">Giờ mở cửa: {br.openingHours}</p>}
                        </div>
                        <a
                          href={
                            br.lat && br.lon
                              ? `https://www.google.com/maps/dir/?api=1&destination=${br.lat},${br.lon}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(br.address)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-primary/10 hover:bg-primary hover:text-white text-primary px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 shrink-0 select-none cursor-pointer border-0"
                        >
                          📍 Chỉ đường
                        </a>
                      </div>
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
                ...(storeSettings.bankInfo?.accountNumber ? [
                  { value: 'bank_transfer', label: 'Chuyển khoản', desc: 'Chuyển khoản ngân hàng / QR', icon: <QrCode size={20}/> }
                ] : []),
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
            <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Sản phẩm ({displayItems.length})</h3>
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {displayItems.map((item: any, idx: number) => {  const getProdId = (coupons.buy_x_get_y?.getProductId?._id || coupons.buy_x_get_y?.getProductId)?.toString();
  const isThisItemGift = item.isGift || (coupons.buy_x_get_y && (item.product?._id || item.product)?.toString() === getProdId);
  return (
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
                    <p className="text-[9px] text-gray-400 font-medium">x{item.qty} · {isThisItemGift ? "0đ" : `${item.price.toLocaleString()}đ`}</p>
                    {isThisItemGift && (
                      <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">🎁 Sản phẩm này được tặng kèm</p>
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">{isThisItemGift ? "0đ" : `${(item.price * item.qty).toLocaleString()}đ`}</span>
                </div>
              ); })}
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
              {shippingDiscount > 0 && deliveryType !== 'pickup' && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Truck size={10}/> Giảm ship ({coupons.shipping?.code})</span>
                  <span className="font-bold">-{shippingDiscount.toLocaleString()}đ</span>
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
                <span className="font-bold">{deliveryType === 'pickup' ? 'Miễn phí' : (netShippingFee === 0 ? 'Miễn phí' : `${netShippingFee.toLocaleString()}đ`)}</span>
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

export default Checkout;
