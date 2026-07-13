import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { 
  Filter, 
  Package, 
  ChevronRight, 
  SlidersHorizontal,
  ChevronLeft,
  ShoppingBag
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { customer } = useAuthStore();

  // States from search parameters
  const currentCategory = searchParams.get('category') || '';
  const searchKeyword = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  // Local filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Queries
  const { data: categoriesData } = useQuery({ 
    queryKey: ['shop-categories'], 
    queryFn: shopService.getCategories 
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['shop-products', currentCategory, searchKeyword, currentSort, page, minPrice, maxPrice],
    queryFn: () => shopService.getProducts({
      category: currentCategory || undefined,
      search: searchKeyword || undefined,
      sort: currentSort,
      page,
      limit: 12,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined
    }),
  });

  const categories = categoriesData?.data || [];
  const products = productsData?.data || [];
  const pagination = productsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    searchParams.set('sort', val);
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handlePageChange = (p: number) => {
    searchParams.set('page', p.toString());
    setSearchParams(searchParams);
  };

  const handleQuickAdd = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!customer) {
      navigate('/login', { state: { from: '/catalog' } });
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

  // Find active category name for breadcrumbs
  const findActiveCategoryName = (): string => {
    if (!currentCategory) return '';
    for (const cat of categories) {
      if (cat._id === currentCategory) return cat.name;
      if (cat.children) {
        const sub = cat.children.find((c: any) => c._id === currentCategory);
        if (sub) return `${cat.name} / ${sub.name}`;
      }
    }
    return '';
  };

  const activeCategoryLabel = findActiveCategoryName();

  return (
    <div className="space-y-6 pb-16">
      
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 pt-2">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <ChevronRight size={10} />
        <Link to="/catalog" className="hover:text-primary transition-colors">Cửa hàng</Link>
        {activeCategoryLabel && (
          <>
            <ChevronRight size={10} />
            <span className="text-gray-600 dark:text-gray-300 font-bold">{activeCategoryLabel}</span>
          </>
        )}
      </nav>

      {/* Catalog Title */}
      <div>
        <h2 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">
          {searchKeyword ? `Kết quả tìm kiếm cho "${searchKeyword}"` : (activeCategoryLabel.split('/').pop() || 'Tất cả sản phẩm')}
        </h2>
        <p className="text-[10px] text-gray-400 font-medium">Tìm thấy {pagination.total} sản phẩm phù hợp</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left side: Category tree and price range filters */}
        <aside className="lg:col-span-1 space-y-6">
          
          {/* Categories card */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Filter size={14}/> Danh mục sản phẩm</h4>
            
            <div className="space-y-2">
              <Link 
                to="/catalog"
                className={`block text-xs font-bold py-1 transition-colors ${
                  !currentCategory ? 'text-primary' : 'text-gray-500 hover:text-primary'
                }`}
              >
                Tất cả sản phẩm
              </Link>
              
              {categories.map((cat: any) => (
                <div key={cat._id} className="space-y-1.5 pl-1">
                  <Link 
                    to={`/catalog?category=${cat._id}`}
                    className={`block text-xs font-bold transition-colors ${
                      currentCategory === cat._id ? 'text-primary' : 'text-gray-600 dark:text-gray-300 hover:text-primary'
                    }`}
                  >
                    {cat.name}
                  </Link>

                  {cat.children?.map((sub: any) => (
                    <Link 
                      key={sub._id}
                      to={`/catalog?category=${sub._id}`}
                      className={`block pl-3 text-[11px] font-semibold transition-colors ${
                        currentCategory === sub._id ? 'text-primary' : 'text-gray-400 hover:text-primary'
                      }`}
                    >
                      - {sub.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Price Filter card */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><SlidersHorizontal size={14}/> Khoảng giá</h4>
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <input 
                  type="number" 
                  placeholder="Từ (đ)" 
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-gray-50 dark:bg-gray-750 outline-none text-xs font-bold"
                />
                <span className="text-gray-400">-</span>
                <input 
                  type="number" 
                  placeholder="Đến (đ)" 
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-gray-50 dark:bg-gray-750 outline-none text-xs font-bold"
                />
              </div>
            </div>
          </div>

        </aside>

        {/* Right side: Catalog items list grid */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* Catalog sorter header */}
          <div className="flex justify-between items-center bg-white dark:bg-gray-800 border dark:border-gray-700 px-4 py-3 rounded-2xl">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Sắp xếp theo</span>
            <select 
              value={currentSort}
              onChange={handleSortChange}
              className="bg-transparent text-xs font-bold text-gray-700 dark:text-white outline-none border rounded-lg px-3 py-1.5 cursor-pointer focus:ring-1 focus:ring-primary dark:border-gray-700"
            >
              <option value="newest">Mới nhất</option>
              <option value="bestseller">Bán chạy nhất</option>
              <option value="priceAsc">Giá tăng dần</option>
              <option value="priceDesc">Giá giảm dần</option>
            </select>
          </div>

          {/* Product grid list */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl py-24 flex flex-col items-center justify-center text-gray-400">
              <Package size={48} className="opacity-20 mb-2" />
              <p className="text-xs font-bold">Không tìm thấy sản phẩm nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((prod: any) => (
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
                    {prod.isFeatured && (
                      <span className="absolute top-2 left-2 bg-yellow-500 text-white text-[9px] font-extrabold px-2 py-1 rounded-md uppercase">Nổi bật</span>
                    )}
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-gray-850 dark:text-white line-clamp-2 leading-snug">{prod.name}</h4>
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
          )}

          {/* Paginator */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 border dark:border-gray-700 px-4 py-3 rounded-2xl">
              <span className="text-xs text-gray-400 font-semibold">Trang {pagination.page} / {pagination.totalPages}</span>
              <div className="flex gap-2">
                <button 
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
};
export default Catalog;
