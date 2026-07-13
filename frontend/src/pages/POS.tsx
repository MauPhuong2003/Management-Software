import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { categoryService } from '../services/categoryService';
import { warehouseService } from '../services/warehouseService';
import { promotionService } from '../services/promotionService';
import { loyaltyService } from '../services/loyaltyService';
import { usePosStore } from '../store/posStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { ShoppingCart, Search, User, Printer, Plus, Minus, CreditCard, Banknote, UserPlus, X, Tag } from 'lucide-react';

const maskPhone = (phone: string) => {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  return '****' + clean.slice(-4);
};

const POS = () => {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [activePosTab, setActivePosTab] = useState<'products' | 'cart'>('products');
  const { 
    cart, customer, paymentMethod, note, addToCart, updateQty, setCustomer, setPaymentMethod, clearCart, getTotal,
    sessions, activeSessionId, addSession, removeSession, setActiveSession
  } = usePosStore();

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => productService.getProducts({ limit: 50 }) });

  const { data: loyaltyConfigData } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: loyaltyService.getConfig
  });
  const loyaltyConfig = loyaltyConfigData?.data;

  const getCustomerTierDiscountPercent = () => {
    if (!customer || !loyaltyConfig?.tiers) return 0;
    const userTier = loyaltyConfig.tiers.find((t: any) => t.name === customer.tier && t.isActive);
    return userTier?.discountPercent || 0;
  };

  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Reset loyalty selection when selected customer changes
  React.useEffect(() => {
    setUsePoints(false);
    setPointsToUse(0);
  }, [customer?._id]);

  const getMaxPointsUsable = () => {
    if (!customer || !loyaltyConfig || !loyaltyConfig.isActive) return 0;
    const subtotal = getTotal();
    if (subtotal < (loyaltyConfig.minOrderToUsePoints || 0)) return 0;

    const maxDiscountAllowed = subtotal * ((loyaltyConfig.maxPointUsagePercent || 100) / 100);
    const equivalentPoints = Math.floor(maxDiscountAllowed / (loyaltyConfig.vndPerPointRedemption || 1000));
    return Math.min(customer.loyaltyPoints || 0, equivalentPoints);
  };

  const maxPointsUsable = getMaxPointsUsable();
  
  const { data: customersData } = useQuery({ 
    queryKey: ['customers-all'], 
    queryFn: () => customerService.getCustomers({ limit: 1000 }) 
  });
  const allCustomers = customersData?.data || [];

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoryService.getCategories({ limit: 100 })
  });
  const allCategories = categoriesData?.data || [];

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getWarehouses
  });
  const allWarehouses = warehousesData?.data || [];

  const { data: promotionsData } = useQuery({ 
    queryKey: ['promotions-active'], 
    queryFn: () => promotionService.getPromotions() 
  });
  const allPromotions = promotionsData?.data || [];

  const getVariantStock = (prodId: string, sku: string) => {
    if (!allWarehouses) return 0;
    return allWarehouses
      .filter((w: any) => w.status === 'active')
      .reduce((sum: number, w: any) => {
        const whProd = w.products?.find((item: any) => 
          (item.productId?._id === prodId || item.productId === prodId) && 
          item.variantSku === sku
        );
        return sum + (whProd?.stock || 0);
      }, 0);
  };

  const getProductTotalStock = (p: any) => {
    if (!allWarehouses) return 0;
    return allWarehouses
      .filter((w: any) => w.status === 'active')
      .reduce((sum: number, w: any) => {
        const whProds = w.products?.filter((item: any) => 
          item.productId?._id === p._id || item.productId === p._id
        ) || [];
        return sum + whProds.reduce((s: number, item: any) => s + (item.stock || 0), 0);
      }, 0);
  };
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeVariantProduct, setActiveVariantProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  
  const [selectedPromo, setSelectedPromo] = useState<any>(null);
  const [isPromoDropdownOpen, setIsPromoDropdownOpen] = useState(false);

  const getDiscountAmount = (promo: any) => {
    if (!promo) return 0;
    const subtotal = getTotal();
    if (subtotal < (promo.minOrderValue || 0)) return 0;

    // Check usage limits
    if (promo.usageLimit !== null && (promo.usedCount || 0) >= promo.usageLimit) {
      return 0;
    }

    if (promo.applyType === 'order' || promo.applyType === 'shipping') {
      if (promo.type === 'percent') {
        return subtotal * (promo.value / 100);
      } else {
        return promo.value;
      }
    }

    if (promo.applyType === 'product') {
      let discount = 0;
      const applyIds = promo.applyProductIds?.map((p: any) => p._id || p) || [];
      for (const item of cart) {
        if (applyIds.includes(item.product._id)) {
          if (promo.type === 'percent') {
            discount += (item.price * item.qty) * (promo.value / 100);
          } else {
            discount += promo.value * item.qty;
          }
        }
      }
      return discount;
    }

    if (promo.applyType === 'buy_x_get_y') {
      const buyProdId = promo.buyProductId?._id || promo.buyProductId;
      const getProdId = promo.getProductId?._id || promo.getProductId;
      
      const buyItem = cart.find(i => i.product._id === buyProdId);
      const getItem = cart.find(i => i.product._id === getProdId);
      
      if (buyItem && getItem && buyItem.qty >= promo.buyQty) {
        return (getItem.price * getItem.qty) * (promo.discountYValue / 100);
      }
    }

    return 0;
  };

  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });

  const createCustomerMutation = useMutation({
    mutationFn: customerService.createCustomer,
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['customers-all'] });
      setCustomer(resData.data);
      setIsAddCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      alert('Tạo khách hàng mới thành công!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể tạo khách hàng');
    }
  });

  const API_BASE = 'http://localhost:5000';

  const checkoutMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await api.post('/orders', orderData);
      return res.data;
    },
    onSuccess: () => {
      alert('Thanh toán thành công!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers-all'] });
      clearCart();
      setSelectedPromo(null);
      setUsePoints(false);
      setPointsToUse(0);
    }
  });

  const handleCheckout = () => {
    if (cart.length === 0) return alert('Giỏ hàng trống');
    const discount = getDiscountAmount(selectedPromo);
    
    const tierDiscountPercent = getCustomerTierDiscountPercent();
    const tierDiscount = Math.round(getTotal() * (tierDiscountPercent / 100));

    const orderData = {
      orderCode: 'POS' + Date.now(),
      customer: customer?._id || null,
      items: cart.map(i => ({ 
        product: i.product._id, 
        variantSku: i.variant?.sku || null, 
        qty: i.qty, 
        price: i.price 
      })),
      totalAmount: Math.max(0, getTotal() - discount - tierDiscount),
      discountAmount: discount + tierDiscount,
      promotionCode: selectedPromo?.code || null,
      paymentMethod,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      orderSource: 'pos',
      note,
      loyaltyPointsUsed: 0
    };
    checkoutMutation.mutate(orderData);
  };

  const filteredProducts = products?.data?.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryIds?.some((cat: any) => (cat?._id || cat) === selectedCategory);
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-4 lg:gap-6">
      {/* Mobile Tab Toggle */}
      <div className="flex lg:hidden bg-white dark:bg-gray-800 p-1.5 rounded-xl border dark:border-gray-700 gap-1.5 shrink-0 shadow-sm">
        <button
          type="button"
          onClick={() => setActivePosTab('products')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePosTab === 'products'
              ? 'bg-primary text-white shadow-sm font-extrabold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          🔍 Chọn sản phẩm ({filteredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActivePosTab('cart')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activePosTab === 'cart'
              ? 'bg-primary text-white shadow-sm font-extrabold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          🛒 Giỏ hàng
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Left Column: Products */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${activePosTab === 'products' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-4 bg-gray-50 dark:bg-gray-700/50 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Tìm sản phẩm theo tên, mã SKU..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" 
            />
          </div>
        </div>

        {/* Categories horizontal scroll filter */}
        <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-700/30 border-b dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button 
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-700 border dark:border-gray-600 text-gray-650 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
          >
            Tất cả
          </button>
          {allCategories.map((cat: any) => (
            <button 
              key={cat._id}
              type="button"
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${selectedCategory === cat._id ? 'bg-primary text-white' : 'bg-white dark:bg-gray-700 border dark:border-gray-600 text-gray-650 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
          {filteredProducts.map((p: any) => (
            <div 
              key={p._id} 
              onClick={() => {
                if (p.variants && p.variants.length > 0) {
                  setActiveVariantProduct(p);
                  setSelectedVariant(p.variants[0]);
                } else {
                  addToCart(p);
                }
              }}
              className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-3.5 cursor-pointer hover:shadow-md hover:border-primary transition-all flex flex-col group relative overflow-hidden"
            >
              {p.variants && p.variants.length > 0 && (
                <span className="absolute top-2 right-2 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                  {p.variants.length} mẫu
                </span>
              )}
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 flex items-center justify-center text-gray-400 group-hover:scale-105 transition-transform overflow-hidden border dark:border-gray-650">
                {p.images && p.images.length > 0 ? (
                  <img src={`${API_BASE}${p.images[0]}`} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingCart size={32} className="opacity-20"/>
                )}
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white text-xs line-clamp-2 flex-1 leading-snug">{p.name}</h3>
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-primary font-extrabold text-sm">
                    {p.variants && p.variants.length > 1 ? (
                      <span>{Math.min(...p.variants.map((v: any) => v.price)).toLocaleString()}đ+</span>
                    ) : (
                      <span>{p.priceSale.toLocaleString()}đ</span>
                    )}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shadow-sm">
                    Tồn: {getProductTotalStock(p)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Cart */}
      <div className={`w-full lg:w-[400px] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${activePosTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Session Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-100/50 dark:bg-gray-700/25 border-b border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar whitespace-nowrap">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-700 text-gray-650 dark:text-gray-300 hover:bg-gray-100/50'}`}
              >
                <span>{s.name}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSession(s.id);
                    }}
                    className={`p-0.5 rounded-md transition-colors ${isActive ? 'hover:bg-indigo-500 text-indigo-200 hover:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-650 text-gray-455'}`}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={addSession}
            className="p-1.5 rounded-lg border border-dashed border-gray-300 hover:border-indigo-500 text-gray-405 hover:text-indigo-500 transition-colors flex items-center justify-center cursor-pointer ml-1"
            title="Thêm đơn mới"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <ShoppingCart size={20} /> Giỏ hàng ({cart.reduce((a, b) => a + b.qty, 0)})
          </h2>
          <button onClick={clearCart} className="text-red-500 text-sm font-medium hover:underline">Xoá tất cả</button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-700 relative">
          {customer ? (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <User size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">{customer.name}</h4>
                  <p className="text-xs text-gray-500 font-mono">{maskPhone(customer.phone) || 'Chưa có SĐT'}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setCustomer(null)}
                className="text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm khách hàng (tên, SĐT)..." 
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  className="w-full pl-8 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-medium" 
                />
                
                {/* Search Results Dropdown */}
                {isCustomerDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCustomerDropdownOpen(false)}></div>
                    <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 p-1 space-y-0.5">
                      {allCustomers.filter((c: any) => {
                        const term = customerSearch.toLowerCase();
                        return (
                          c.name?.toLowerCase().includes(term) ||
                          c.phone?.includes(term) ||
                          c.email?.toLowerCase().includes(term)
                        );
                      }).length === 0 ? (
                        <div className="p-3 text-center">
                          <p className="text-xs text-gray-400 mb-2">Không tìm thấy khách hàng</p>
                          {hasPermission('customers', 'create') && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setIsCustomerDropdownOpen(false);
                                setIsAddCustomerModalOpen(true);
                              }}
                              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mx-auto"
                            >
                              <UserPlus size={12} /> Tạo khách hàng mới
                            </button>
                          )}
                        </div>
                      ) : (
                        allCustomers
                          .filter((c: any) => {
                            const term = customerSearch.toLowerCase();
                            return (
                              c.name?.toLowerCase().includes(term) ||
                              c.phone?.includes(term) ||
                              c.email?.toLowerCase().includes(term)
                            );
                          })
                          .map((c: any) => (
                            <div 
                              key={c._id}
                              onClick={() => {
                                setCustomer(c);
                                setCustomerSearch('');
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-left text-xs border-b last:border-b-0 dark:border-gray-700/50"
                            >
                              <div className="font-semibold text-gray-800 dark:text-white">{c.name}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between font-mono">
                                <span>{maskPhone(c.phone) || 'Không có SĐT'}</span>
                                {c.email && <span className="italic">{c.email}</span>}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </>
                )}
              </div>
              {hasPermission('customers', 'create') && (
                <button 
                  type="button" 
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  title="Tạo khách hàng mới"
                  className="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-100 dark:border-indigo-850 p-2 rounded-lg text-primary transition-colors flex items-center justify-center shrink-0"
                >
                  <UserPlus size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loyalty Points status display */}
        {customer && (
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-indigo-50/5 dark:bg-indigo-950/5 text-left flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Điểm tích lũy & Hạng:</span>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-full">
              {customer.loyaltyPoints?.toLocaleString() || 0} điểm ({customer.tier || 'Đồng'})
            </span>
          </div>
        )}

        {/* Promotion selection */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/10 dark:bg-gray-800/10 relative">
          {selectedPromo ? (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3 flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Tag size={16} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-800 dark:text-white text-xs uppercase bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded font-mono">
                      {selectedPromo.code}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-450">
                      -{getDiscountAmount(selectedPromo).toLocaleString()}đ
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-505 mt-0.5">
                    {selectedPromo.applyType === 'buy_x_get_y' ? 'Mua X tặng Y' : 
                     selectedPromo.type === 'percent' ? `Giảm ${selectedPromo.value}%` : `Giảm ${selectedPromo.value.toLocaleString()}đ`}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPromo(null)}
                className="text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button 
                type="button" 
                onClick={() => setIsPromoDropdownOpen(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-405 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-semibold"
              >
                <Tag size={14} /> Áp dụng khuyến mãi
              </button>

              {/* Promotions dropdown */}
              {isPromoDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsPromoDropdownOpen(false)}></div>
                  <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-105 dark:border-gray-700 rounded-lg shadow-xl max-h-56 overflow-y-auto z-50 p-1.5 space-y-1">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase px-2 py-1 border-b dark:border-gray-750 text-left">Mã khuyến mãi khả dụng</div>
                    {allPromotions.filter((p: any) => {
                      const now = new Date();
                      if (p.status !== 'active') return false;
                      if (p.startDate && new Date(p.startDate) > now) return false;
                      if (p.endDate && new Date(p.endDate) < now) return false;
                      return true;
                    }).length === 0 ? (
                      <p className="text-xs text-gray-400 p-3 text-center">Không có chương trình khuyến mãi nào đang diễn ra</p>
                    ) : (
                      allPromotions
                        .filter((p: any) => {
                          const now = new Date();
                          if (p.status !== 'active') return false;
                          if (p.startDate && new Date(p.startDate) > now) return false;
                          if (p.endDate && new Date(p.endDate) < now) return false;
                          return true;
                        })
                        .map((p: any) => {
                          const subtotal = getTotal();
                          const isMinOrderSatisfied = subtotal >= (p.minOrderValue || 0);
                          const isLimitNotExceeded = p.usageLimit === null || (p.usedCount || 0) < p.usageLimit;
                          const isApplicable = isMinOrderSatisfied && isLimitNotExceeded;
                          
                          return (
                            <div 
                              key={p._id}
                              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${isApplicable ? 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750' : 'border-gray-50 dark:border-gray-800 opacity-60'}`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[10px] uppercase bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300 font-mono">
                                  {p.code}
                                </span>
                                {isApplicable ? (
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setSelectedPromo(p);
                                      setIsPromoDropdownOpen(false);
                                    }}
                                    className="bg-primary text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-indigo-700 transition-colors"
                                  >
                                    Áp dụng
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-red-500 font-semibold uppercase">Chưa đủ điều kiện</span>
                                )}
                              </div>
                              <div className="text-[11px] font-medium text-gray-800 dark:text-gray-250">
                                {p.applyType === 'buy_x_get_y' ? (
                                  <span>Mua {p.buyQty} <b>{p.buyProductId?.name || 'Sản phẩm X'}</b> giảm <b>{p.discountYValue}%</b> Y</span>
                                ) : (
                                  <span>Giảm {p.type === 'percent' ? `${p.value}%` : `${p.value.toLocaleString()}đ`}</span>
                                )}
                              </div>
                              <div className="text-[9px] text-gray-500 space-y-0.5">
                                {!isMinOrderSatisfied && (
                                  <p className="text-amber-600 dark:text-amber-400">
                                    Đơn tối thiểu {p.minOrderValue.toLocaleString()}đ (cần thêm {(p.minOrderValue - subtotal).toLocaleString()}đ)
                                  </p>
                                )}
                                {!isLimitNotExceeded && (
                                  <p className="text-red-500">Mã giảm giá đã hết lượt sử dụng</p>
                                )}
                                {isMinOrderSatisfied && isLimitNotExceeded && (
                                  <p>Đơn tối thiểu: {p.minOrderValue.toLocaleString()}đ</p>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p>Giỏ hàng chưa có sản phẩm</p>
            </div>
          ) : cart.map(item => {
            const itemKey = item.product._id + '-' + (item.variant?.sku || 'default');
            const variantSku = item.variant?.sku || null;
            return (
              <div key={itemKey} className="flex gap-3 items-center border-b border-gray-50 dark:border-gray-700 pb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white line-clamp-1 leading-snug">{item.product.name}</h4>
                  {item.variant && (
                    <div className="text-[10px] text-gray-500 mt-1 flex flex-col gap-0.5">
                      <span className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 px-1.5 py-0.5 rounded font-mono text-[9px] w-max text-indigo-700 dark:text-indigo-400 font-semibold">
                        SKU: {item.variant.sku}
                      </span>
                      <span className="italic font-medium text-gray-500 dark:text-gray-400">
                        {item.variant.options?.map((o: any) => `${o.key}: ${o.value}`).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="text-primary font-extrabold text-sm mt-1">{item.price.toLocaleString()}đ</div>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shrink-0">
                  <button onClick={() => updateQty(item.product._id, variantSku, item.qty - 1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.product._id, variantSku, item.qty + 1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"><Plus size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 space-y-3.5">
          <div className="space-y-1.5 border-b dark:border-gray-700 pb-2">
            <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Tạm tính</span>
              <span>{getTotal().toLocaleString()}đ</span>
            </div>
            {selectedPromo && (
              <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-450">
                <span>Khuyến mãi ({selectedPromo.code})</span>
                <span>-{getDiscountAmount(selectedPromo).toLocaleString()}đ</span>
              </div>
            )}
            {customer && getCustomerTierDiscountPercent() > 0 && (
              <div className="flex justify-between text-xs font-semibold text-purple-650 dark:text-purple-400">
                <span>Ưu đãi hạng ({customer.tier} -{getCustomerTierDiscountPercent()}%)</span>
                <span>-{Math.round(getTotal() * (getCustomerTierDiscountPercent() / 100)).toLocaleString()}đ</span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
            <span>Tổng thanh toán</span>
            <span className="text-primary">
              {Math.max(0, getTotal() - getDiscountAmount(selectedPromo) - Math.round(getTotal() * (getCustomerTierDiscountPercent() / 100))).toLocaleString()}đ
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              <Banknote size={18} /> Tiền mặt
            </button>
            <button onClick={() => setPaymentMethod('transfer')} className={`py-2 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${paymentMethod === 'transfer' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              <CreditCard size={18} /> Chuyển khoản
            </button>
          </div>

          <button 
            onClick={handleCheckout} 
            disabled={cart.length === 0 || checkoutMutation.isPending || !hasPermission('pos', 'create')} 
            className="w-full bg-primary hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
             <Printer size={20} /> {!hasPermission('pos', 'create') ? 'Không có quyền thanh toán' : checkoutMutation.isPending ? 'Đang xử lý...' : 'Thanh toán & In Bill'}
          </button>
        </div>
      </div>

      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tạo khách hàng mới</h3>
              <button 
                type="button" 
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCustomer.name) return alert('Vui lòng nhập tên khách hàng');
                createCustomerMutation.mutate(newCustomer);
              }}
              className="space-y-4 text-left"
            >
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300 font-medium">Tên khách hàng *</label>
                <input 
                  type="text" 
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300 font-medium">Số điện thoại</label>
                <input 
                  type="text" 
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300 font-medium">Email</label>
                <input 
                  type="email" 
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300 font-medium">Địa chỉ</label>
                <input 
                  type="text" 
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddCustomerModalOpen(false)} 
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-semibold"
                >
                  Huỷ
                </button>
                <button 
                  type="submit" 
                  disabled={createCustomerMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {createCustomerMutation.isPending ? 'Đang tạo...' : 'Tạo khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeVariantProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chọn biến thể sản phẩm</h3>
                <p className="text-xs text-gray-500 mt-0.5">{activeVariantProduct.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => { setActiveVariantProduct(null); setSelectedVariant(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0 border dark:border-gray-600">
                {activeVariantProduct.images && activeVariantProduct.images.length > 0 ? (
                  <img src={`${API_BASE}${activeVariantProduct.images[0]}`} alt={activeVariantProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400"><ShoppingCart size={24} /></div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center text-left">
                <div className="text-xs text-gray-500 font-mono">
                  SKU được chọn: <b className="font-semibold text-gray-800 dark:text-white">{selectedVariant?.sku || 'N/A'}</b>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Giá bán: <b className="text-primary text-base font-extrabold">{selectedVariant?.price?.toLocaleString() || '0'}đ</b>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Tồn kho: <b className="font-semibold text-gray-800 dark:text-white">{selectedVariant ? getVariantStock(activeVariantProduct._id, selectedVariant.sku) : 0} sản phẩm</b>
                </div>
              </div>
            </div>

            {/* List of variants in radio list */}
            <div className="max-h-48 overflow-y-auto border dark:border-gray-700 rounded-lg p-2 space-y-1.5 mb-5 bg-gray-50/50 dark:bg-gray-800/50">
              {activeVariantProduct.variants.map((v: any) => {
                const isSelected = selectedVariant?.sku === v.sku;
                return (
                  <div 
                    key={v.sku}
                    onClick={() => setSelectedVariant(v)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'border-primary bg-indigo-50/30 dark:bg-indigo-950/20 text-primary' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
                  >
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="font-bold text-gray-800 dark:text-white">
                        {v.options?.map((o: any) => `${o.key}: ${o.value}`).join(' / ')}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">SKU: {v.sku}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-extrabold text-gray-900 dark:text-white">{v.price?.toLocaleString()}đ</span>
                      <span className="text-[9px] text-gray-400">Tồn: {getVariantStock(activeVariantProduct._id, v.sku)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button 
                type="button" 
                onClick={() => { setActiveVariantProduct(null); setSelectedVariant(null); }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-semibold"
              >
                Huỷ
              </button>
              <button 
                type="button" 
                disabled={!selectedVariant}
                onClick={() => {
                  if (selectedVariant) {
                    addToCart(activeVariantProduct, selectedVariant);
                    setActiveVariantProduct(null);
                    setSelectedVariant(null);
                  }
                }}
                className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
