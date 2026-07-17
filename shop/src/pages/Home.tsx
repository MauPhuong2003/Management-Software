import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  ChevronRightIcon, 
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Heart,
  Plus
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export const Home = () => {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { customer } = useAuthStore();

  // Queries
  const { data: settingsData } = useQuery({ queryKey: ['shop-settings'], queryFn: shopService.getSettings });
  const { data: flashSaleData } = useQuery({ queryKey: ['shop-flash-sale'], queryFn: shopService.getActiveFlashSale });
  const { data: featuredData } = useQuery({ queryKey: ['shop-products-featured'], queryFn: () => shopService.getProducts({ isFeatured: true, limit: 8 }) });
  const { data: bestSellersData } = useQuery({ queryKey: ['shop-products-bestseller'], queryFn: () => shopService.getProducts({ sort: 'bestseller', limit: 10 }) });
  const { data: allProductsData } = useQuery({ queryKey: ['shop-products-all'], queryFn: () => shopService.getProducts({ limit: 12 }) });
  const { data: categoriesData } = useQuery({ queryKey: ['shop-categories'], queryFn: shopService.getCategories });
  const { data: minigameRes } = useQuery({ queryKey: ['shop-minigame-active'], queryFn: shopService.getActiveMiniGame });

  // Banner slider state
  const banners = settingsData?.data?.banners || [];
  const [currentBanner, setCurrentBanner] = useState(0);

  // Auto cycle banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  // Flash Sale Countdown logic
  const activeFlashSale = flashSaleData?.data;
  const [countdown, setCountdown] = useState<string>('00:00:00');

  useEffect(() => {
    if (!activeFlashSale || !activeFlashSale.endTime) return;
    
    const interval = setInterval(() => {
      const difference = new Date(activeFlashSale.endTime).getTime() - new Date().getTime();
      if (difference <= 0) {
        setCountdown('00:00:00');
        clearInterval(interval);
        return;
      }
      
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFlashSale]);

  const handleQuickAdd = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!customer) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    addItem({
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        images: product.images,
        priceSale: product.priceSale,
        priceCompare: product.priceCompare
      },
      variantSku: null,
      qty: 1,
      price: product.priceSale,
      selectedAttributes: []
    });
    alert(`Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  const categories = categoriesData?.data || [];
  const featuredProducts = featuredData?.data || [];
  const bestSellers = bestSellersData?.data || [];
  const allProducts = allProductsData?.data || [];

  return (
    <div className="space-y-12 pb-16">
      
      {/* 1. Main Banner Slider */}
      <section className="relative w-full h-[320px] md:h-[450px] overflow-hidden bg-gray-100 rounded-2xl shadow-sm">
        {banners.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <Sparkles size={48} className="opacity-25 mb-2 animate-spin" />
            <p className="text-xs font-semibold">Chưa thiết lập banner cửa hàng</p>
          </div>
        ) : (
          <>
            {banners.map((url: string, index: number) => (
              <div 
                key={index} 
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <img src={url?.startsWith('http') ? url : `${API_BASE}${url}`} alt={`Banner ${index}`} className="w-full h-full object-cover" />
              </div>
            ))}
            
            {/* Arrows */}
            {banners.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white text-gray-800 shadow cursor-pointer transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white text-gray-800 shadow cursor-pointer transition-all"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Dot Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {banners.map((_: any, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentBanner(idx)}
                      className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentBanner ? 'bg-primary w-5' : 'bg-white/50 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* MiniGame Promotion Banner */}
      {minigameRes?.data?.minigame && (() => {
        const activeMinigame = minigameRes.data.minigame;
        return (
          <section className="bg-gradient-to-r from-indigo-650 via-purple-600 to-pink-650 p-6 md:p-8 rounded-3xl text-white relative overflow-hidden shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 text-left animate-fade-in duration-300">
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2 text-left relative z-10 max-w-xl">
              <span className="bg-amber-400 text-gray-900 font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full inline-block">
                🎉 SỰ KIỆN ĐẶC BIỆT
              </span>
              <h2 className="text-xl md:text-2xl font-black font-sans leading-tight">
                {activeMinigame.name}
              </h2>
              <p className="text-xs md:text-sm text-white/90 font-medium">
                Chỉ với <span className="font-extrabold text-amber-300">{activeMinigame.pointsPerSpin} điểm</span> tích lũy để đổi lấy 1 lượt quay. Thử vận may trúng ngay Voucher hấp dẫn và Quà tặng giá trị từ shop!
              </p>
            </div>
            
            <div className="shrink-0 relative z-10">
              <Link 
                to="/lucky-wheel" 
                className="px-6 py-3 bg-white hover:bg-amber-300 hover:text-gray-900 text-indigo-600 font-black rounded-2xl text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer border-0"
              >
                <span>🎡 Chơi ngay</span> <ArrowRight size={14}/>
              </Link>
            </div>
          </section>
        );
      })()}

      {/* 2. Highlight Categories section */}
      {categories.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider">Danh mục sản phẩm</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat: any) => (
              <Link 
                key={cat._id} 
                to={`/catalog?category=${cat._id}`}
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 hover:border-primary p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 transition-all hover:shadow-md cursor-pointer group"
              >
                {cat.image ? (
                   <img src={cat.image?.startsWith('http') ? cat.image : `${API_BASE}${cat.image}`} alt={cat.name} className="w-12 h-12 object-cover rounded-full group-hover:scale-[1.08] transition-transform" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-primary flex items-center justify-center font-bold text-lg">{cat.name.slice(0,1)}</div>
                )}
                <span className="text-xs font-bold text-gray-700 dark:text-gray-250 truncate w-full">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 1. Section Flash Sale active countdown */}
      {activeFlashSale && (
        <section className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-red-100 dark:border-red-900/40 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="text-red-500 fill-current animate-bounce" size={24} />
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">Giá chớp nhoáng (Flash Sale)</h2>
            </div>
            
            {/* Timer countdown widgets */}
            <div className="flex items-center gap-2 text-xs font-bold dark:text-white">
              <span className="text-gray-400 font-semibold">Kết thúc trong:</span>
              <span className="bg-red-500 text-white font-mono text-sm px-3.5 py-1.5 rounded-lg shadow-sm font-extrabold tracking-wider">{countdown}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {activeFlashSale.products?.slice(0, 4).map((pItem: any) => {
              if (!pItem.product || !pItem.active) return null;
              const prod = pItem.product;
              const isQuotaAvailable = (pItem.limitQty || 0) > (pItem.soldQty || 0);
              const salePrice = isQuotaAvailable
                ? Math.max(0, prod.priceSale - (prod.priceSale * (pItem.discountPercent / 100)))
                : prod.priceSale;
              const progressPercent = Math.min(100, Math.floor((pItem.soldQty / pItem.limitQty) * 100)) || 0;

              return (
                <Link 
                  key={prod._id} 
                  to={`/product/${prod._id}`}
                  className="bg-white dark:bg-gray-800 border border-red-100 dark:border-red-950/30 rounded-3xl overflow-hidden hover:shadow-xl hover:border-red-200 dark:hover:border-red-900 transition-all group flex flex-col justify-between p-3 relative"
                >
                  {/* Image Container with Red Flash Sale discount tag */}
                  <div className="relative aspect-square bg-gray-50 dark:bg-gray-750 rounded-2xl overflow-hidden mb-3">
                    {prod.images && prod.images.length > 0 ? (
                      <img src={prod.images[0]?.startsWith('http') ? prod.images[0] : `${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={40}/></div>
                    )}
                    {isQuotaAvailable ? (
                      <span className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase shadow-sm">⚡ -{pItem.discountPercent}%</span>
                    ) : (
                      <span className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase shadow-sm">⚡ Bán giá gốc</span>
                    )}
                  </div>

                  {/* Text & Pricing Info */}
                  <div className="flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-2">
                      <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight text-left h-8">
                        {prod.name}
                      </h4>

                      <div className="text-left space-y-0.5">
                        {isQuotaAvailable && (
                          <p className="text-[11px] text-gray-400 line-through font-medium leading-none">
                            {prod.priceSale.toLocaleString()} VNĐ
                          </p>
                        )}
                        <p className="text-sm font-black text-red-500 leading-none">
                          {salePrice.toLocaleString()} VNĐ
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Sold Count */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>Đã bán: {pItem.soldQty}</span>
                        <span>SL Sale: {pItem.limitQty}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${isQuotaAvailable ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-amber-500'}`} style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Section Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="text-yellow-500 fill-current"/> Sản phẩm nổi bật
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Những mặt hàng tốt nhất được lựa chọn cho bạn</p>
            </div>
            <Link to="/catalog" className="text-primary hover:text-indigo-700 text-xs font-bold flex items-center gap-0.5">Xem tất cả <ArrowRight size={14}/></Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((prod: any) => (
              <Link 
                key={prod._id} 
                to={`/product/${prod._id}`}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 rounded-3xl overflow-hidden hover:shadow-xl hover:border-gray-200 dark:hover:border-gray-700 transition-all group flex flex-col justify-between p-3 relative"
              >
                {/* Image Container with Ribbon and Wishlist heart */}
                <div className="relative aspect-square bg-gray-50 dark:bg-gray-750 rounded-2xl overflow-hidden mb-3">
                  {prod.images && prod.images.length > 0 ? (
                    <img src={prod.images[0]?.startsWith('http') ? prod.images[0] : `${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={40}/></div>
                  )}

                  {/* Ribbon Tag: Nổi bật */}
                  {prod.isFeatured && (
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-br-2xl shadow-sm uppercase tracking-wider">
                      Nổi bật
                    </div>
                  )}

                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      alert('Đã thêm sản phẩm vào danh sách yêu thích!');
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/95 dark:bg-gray-850/95 border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <Heart size={13} className="fill-transparent" />
                  </button>
                </div>

                {/* Text & Pricing Info */}
                <div className="flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-2">
                    {/* Product Title */}
                    <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight text-left h-8">
                      {prod.name}
                    </h4>

                    {/* Soft Blue Discount Badge */}
                    {prod.priceCompare > 0 && prod.priceCompare > prod.priceSale ? (
                      <div className="text-left">
                        <span className="inline-block border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 text-sky-500 dark:text-sky-400 text-[10px] font-extrabold px-2 py-0.5 rounded-lg">
                          Giảm {Math.round((1 - prod.priceSale / prod.priceCompare) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <div className="h-[20px]"></div>
                    )}

                    {/* Pricing Stack */}
                    <div className="text-left space-y-0.5">
                      {/* Compare Price */}
                      {prod.priceCompare > 0 && prod.priceCompare > prod.priceSale ? (
                        <p className="text-[11px] text-gray-400 line-through font-medium leading-none">
                          {prod.priceCompare.toLocaleString()} VNĐ
                        </p>
                      ) : (
                        <div className="h-[11px]"></div>
                      )}
                      {/* Sale Price */}
                      <p className="text-sm font-black text-cyan-500 dark:text-cyan-400 leading-none">
                        {prod.priceSale.toLocaleString()} VNĐ
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Sold count & Quick Plus Add button */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-50 dark:border-gray-700/50">
                    <p className="text-[10px] text-gray-400 font-bold">
                      Đã bán {prod.soldCount > 1000 ? `${(prod.soldCount / 1000).toFixed(1)}k` : prod.soldCount || 0}
                    </p>
                    <button 
                      type="button"
                      onClick={(e) => handleQuickAdd(prod, e)}
                      className="w-7 h-7 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center shadow-sm transition-colors cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Section Best Sellers */}
      {bestSellers.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="text-cyan-500 fill-current"/> Sản phẩm bán chạy
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Những sản phẩm được yêu thích và bán nhiều nhất</p>
            </div>
            <Link to="/catalog?sort=bestseller" className="text-primary hover:text-indigo-700 text-xs font-bold flex items-center gap-0.5">Xem tất cả <ArrowRight size={14}/></Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {bestSellers.map((prod: any) => (
              <Link 
                key={prod._id} 
                to={`/product/${prod._id}`}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 rounded-3xl overflow-hidden hover:shadow-xl hover:border-gray-200 dark:hover:border-gray-700 transition-all group flex flex-col justify-between p-3 relative"
              >
                {/* Image Container with Ribbon and Wishlist heart */}
                <div className="relative aspect-square bg-gray-50 dark:bg-gray-750 rounded-2xl overflow-hidden mb-3">
                  {prod.images && prod.images.length > 0 ? (
                    <img src={prod.images[0]?.startsWith('http') ? prod.images[0] : `${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={40}/></div>
                  )}

                  {/* Ribbon Tag: Bán chạy */}
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] font-black px-2.5 py-1 rounded-br-2xl shadow-sm uppercase tracking-wider">
                    Bán chạy
                  </div>

                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      alert('Đã thêm sản phẩm vào danh sách yêu thích!');
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/95 dark:bg-gray-850/95 border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <Heart size={13} className="fill-transparent" />
                  </button>
                </div>

                {/* Text & Pricing Info */}
                <div className="flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-2">
                    {/* Product Title */}
                    <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight text-left h-8">
                      {prod.name}
                    </h4>

                    {/* Soft Blue Discount Badge */}
                    {prod.priceCompare > 0 && prod.priceCompare > prod.priceSale ? (
                      <div className="text-left">
                        <span className="inline-block border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 text-sky-500 dark:text-sky-400 text-[10px] font-extrabold px-2 py-0.5 rounded-lg">
                          Giảm {Math.round((1 - prod.priceSale / prod.priceCompare) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <div className="h-[20px]"></div>
                    )}

                    {/* Pricing Stack */}
                    <div className="text-left space-y-0.5">
                      {/* Compare Price */}
                      {prod.priceCompare > 0 && prod.priceCompare > prod.priceSale ? (
                        <p className="text-[11px] text-gray-400 line-through font-medium leading-none">
                          {prod.priceCompare.toLocaleString()} VNĐ
                        </p>
                      ) : (
                        <div className="h-[11px]"></div>
                      )}
                      {/* Sale Price */}
                      <p className="text-sm font-black text-cyan-500 dark:text-cyan-400 leading-none">
                        {prod.priceSale.toLocaleString()} VNĐ
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Sold count & Quick Plus Add button */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-50 dark:border-gray-700/50">
                    <p className="text-[10px] text-gray-400 font-bold">
                      Đã bán {prod.soldCount > 1000 ? `${(prod.soldCount / 1000).toFixed(1)}k` : prod.soldCount || 0}
                    </p>
                    <button 
                      type="button"
                      onClick={(e) => handleQuickAdd(prod, e)}
                      className="w-7 h-7 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center shadow-sm transition-colors cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Section All Products */}
      {allProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Package className="text-gray-500"/> Tất cả sản phẩm
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Khám phá toàn bộ danh mục sản phẩm của chúng tôi</p>
            </div>
            <Link to="/catalog" className="text-primary hover:text-indigo-700 text-xs font-bold flex items-center gap-0.5">Xem tất cả <ArrowRight size={14}/></Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {allProducts.map((prod: any) => (
              <Link 
                key={prod._id} 
                to={`/product/${prod._id}`}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 rounded-3xl overflow-hidden hover:shadow-xl hover:border-gray-200 dark:hover:border-gray-700 transition-all group flex flex-col justify-between p-3 relative"
              >
                {/* Image Container with Wishlist heart */}
                <div className="relative aspect-square bg-gray-50 dark:bg-gray-750 rounded-2xl overflow-hidden mb-3">
                  {prod.images && prod.images.length > 0 ? (
                    <img src={prod.images[0]?.startsWith('http') ? prod.images[0] : `${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={40}/></div>
                  )}

                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      alert('Đã thêm sản phẩm vào danh sách yêu thích!');
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/95 dark:bg-gray-850/95 border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <Heart size={13} className="fill-transparent" />
                  </button>
                </div>

                {/* Text & Pricing Info */}
                <div className="flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-2">
                    {/* Product Title */}
                    <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight text-left h-8">
                      {prod.name}
                    </h4>

                    {/* Soft Blue Discount Badge */}
                    {prod.priceCompare > 0 && prod.priceCompare > prod.priceSale ? (
                      <div className="text-left">
                        <span className="inline-block border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 text-sky-500 dark:text-sky-400 text-[10px] font-extrabold px-2 py-0.5 rounded-lg">
                          Giảm {Math.round((1 - prod.priceSale / prod.priceCompare) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <div className="h-[20px]"></div>
                    )}

                    {/* Pricing Stack */}
                    <div className="text-left space-y-0.5">
                      {/* Compare Price */}
                      {prod.priceCompare > 0 && prod.priceCompare > prod.priceSale ? (
                        <p className="text-[11px] text-gray-400 line-through font-medium leading-none">
                          {prod.priceCompare.toLocaleString()} VNĐ
                        </p>
                      ) : (
                        <div className="h-[11px]"></div>
                      )}
                      {/* Sale Price */}
                      <p className="text-sm font-black text-cyan-500 dark:text-cyan-400 leading-none">
                        {prod.priceSale.toLocaleString()} VNĐ
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Sold count & Quick Plus Add button */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-50 dark:border-gray-700/50">
                    <p className="text-[10px] text-gray-400 font-bold">
                      Đã bán {prod.soldCount > 1000 ? `${(prod.soldCount / 1000).toFixed(1)}k` : prod.soldCount || 0}
                    </p>
                    <button 
                      type="button"
                      onClick={(e) => handleQuickAdd(prod, e)}
                      className="w-7 h-7 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center shadow-sm transition-colors cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
export default Home;
