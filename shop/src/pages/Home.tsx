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
  ShoppingBag
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
  const { data: categoriesData } = useQuery({ queryKey: ['shop-categories'], queryFn: shopService.getCategories });

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
                <img src={`${API_BASE}${url}`} alt={`Banner ${index}`} className="w-full h-full object-cover" />
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
                  <img src={`${API_BASE}${cat.image}`} alt={cat.name} className="w-12 h-12 object-cover rounded-full group-hover:scale-[1.08] transition-transform" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-primary flex items-center justify-center font-bold text-lg">{cat.name.slice(0,1)}</div>
                )}
                <span className="text-xs font-bold text-gray-700 dark:text-gray-250 truncate w-full">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Section Flash Sale active countdown */}
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
              if (!pItem.product) return null;
              const prod = pItem.product;
              const salePrice = Math.max(0, prod.priceSale - (prod.priceSale * (pItem.discountPercent / 100)));
              const progressPercent = Math.min(100, Math.floor((pItem.soldQty / pItem.limitQty) * 100)) || 0;

              return (
                <Link 
                  key={prod._id} 
                  to={`/product/${prod._id}`}
                  className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-gray-50 dark:bg-gray-750 overflow-hidden">
                    {prod.images && prod.images.length > 0 ? (
                      <img src={`${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={48}/></div>
                    )}
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-extrabold px-2 py-1 rounded-md uppercase">⚡ -{pItem.discountPercent}%</span>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white line-clamp-2 leading-snug">{prod.name}</h4>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-red-500">{salePrice.toLocaleString()}đ</span>
                        <span className="text-[10px] text-gray-400 line-through font-medium">{prod.priceSale.toLocaleString()}đ</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>Đã bán: {pItem.soldQty}</span>
                        <span>Giới hạn: {pItem.limitQty}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Section Featured Products */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="text-yellow-500 fill-current"/> Sản phẩm nổi bật</h3>
            <p className="text-[10px] text-gray-400 font-medium">Những mặt hàng tốt nhất được lựa chọn cho bạn</p>
          </div>
          <Link to="/catalog" className="text-primary hover:text-indigo-700 text-xs font-bold flex items-center gap-0.5">Xem tất cả <ArrowRight size={14}/></Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-10 col-span-full text-center">Chưa có sản phẩm nổi bật</p>
          ) : featuredProducts.map((prod: any) => (
            <Link 
              key={prod._id} 
              to={`/product/${prod._id}`}
              className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="relative aspect-square bg-gray-50 dark:bg-gray-750 overflow-hidden">
                {prod.images && prod.images.length > 0 ? (
                  <img src={`${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={48}/></div>
                )}
                <span className="absolute top-2 left-2 bg-yellow-500 text-white text-[9px] font-extrabold px-2 py-1 rounded-md uppercase">Nổi bật</span>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-855 dark:text-white line-clamp-2 leading-snug">{prod.name}</h4>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-extrabold text-primary dark:text-indigo-400">{prod.priceSale.toLocaleString()}đ</span>
                    {prod.priceCompare > 0 && (
                      <span className="text-[10px] text-gray-400 line-through font-medium">{prod.priceCompare.toLocaleString()}đ</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={(e) => handleQuickAdd(prod, e)}
                  className="w-full py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-xl text-[10px] font-bold text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ShoppingBag size={12}/> Thêm vào giỏ
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
};
export default Home;
