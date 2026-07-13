import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { shopService } from '../services/shopService';
import { 
  ShoppingCart, 
  User, 
  Search, 
  Menu, 
  X, 
  ChevronDown, 
  LogOut, 
  MapPin, 
  Package, 
  Home
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export const Header = () => {
  const navigate = useNavigate();
  const cartTotalItems = useCartStore((state) => state.getCartTotalItems());
  const { customer, logout } = useAuthStore();
  const [categoriesTree, setCategoriesTree] = useState<any[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch settings & category tree
  useEffect(() => {
    shopService.getCategories()
      .then(res => setCategoriesTree(res.data || []))
      .catch(err => console.error(err));
  }, []);

  // Search debounce and fetch suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      shopService.getProducts({ search: searchQuery, limit: 5 })
        .then(res => {
          setSuggestions(res.data || []);
        })
        .catch(err => console.error(err));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Click outside to close search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchFocused(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setIsMobileOpen(!isMobileOpen)} 
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white cursor-pointer"
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="text-xl font-black text-primary dark:text-indigo-400 flex items-center gap-1.5 font-sans tracking-wide uppercase">
              ⚡ Storefront
            </Link>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-700 dark:text-gray-200 relative">
            <Link to="/" className="hover:text-primary dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"><Home size={16}/> Trang chủ</Link>
            
            {/* Categories hierarchical hover menu */}
            <div 
              className="relative"
              onMouseEnter={() => setIsCatDropdownOpen(true)}
              onMouseLeave={() => setIsCatDropdownOpen(false)}
            >
              <button className="hover:text-primary dark:hover:text-indigo-400 flex items-center gap-0.5 transition-colors cursor-pointer py-2">
                Danh mục <ChevronDown size={14} />
              </button>
              
              {isCatDropdownOpen && categoriesTree.length > 0 && (
                <div className="absolute left-0 mt-0 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 divide-y dark:divide-gray-700">
                  {categoriesTree.map((cat: any) => (
                    <div key={cat._id} className="relative group/sub">
                      <Link 
                        to={`/catalog?category=${cat._id}`} 
                        className="flex justify-between items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold"
                        onClick={() => setIsCatDropdownOpen(false)}
                      >
                        {cat.name}
                        {cat.children?.length > 0 && <ChevronDown size={12} className="-rotate-90 text-gray-400" />}
                      </Link>

                      {/* Sub-categories tree popup */}
                      {cat.children?.length > 0 && (
                        <div className="absolute left-full top-0 ml-0.5 w-48 bg-white dark:bg-gray-855 rounded-xl shadow-md border dark:border-gray-700 py-1 hidden group-hover/sub:block">
                          {cat.children.map((sub: any) => (
                            <Link 
                              key={sub._id}
                              to={`/catalog?category=${sub._id}`}
                              className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                              onClick={() => setIsCatDropdownOpen(false)}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Link to="/catalog" className="hover:text-primary dark:hover:text-indigo-400 transition-colors">Tất cả sản phẩm</Link>
          </nav>

          {/* Search bar with debounce suggestions */}
          <div ref={searchRef} className="flex-1 max-w-md relative hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input 
                type="text" 
                placeholder="Tìm sản phẩm, thương hiệu, SKU..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full pl-10 pr-4 py-2 border rounded-full outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-bold"
              />
              <Search className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            </form>

            {/* Suggestions dropdown */}
            {isSearchFocused && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden divide-y dark:divide-gray-700 z-50">
                {suggestions.map((item: any) => (
                  <Link 
                    key={item._id} 
                    to={`/product/${item._id}`}
                    onClick={() => { setIsSearchFocused(false); setSearchQuery(''); }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {item.images && item.images.length > 0 ? (
                      <img src={`${API_BASE}${item.images[0]}`} alt="Product" className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400"><Package size={14}/></div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800 dark:text-white line-clamp-1">{item.name}</p>
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">{item.priceSale.toLocaleString()}đ</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Cart Icon */}
            <Link to="/cart" className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-indigo-400 transition-colors cursor-pointer">
              <ShoppingCart size={22} />
              {cartTotalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow">
                  {cartTotalItems}
                </span>
              )}
            </Link>

            {/* Profile Dropdown */}
            {customer ? (
              <div 
                className="relative"
                onMouseEnter={() => setIsUserDropdownOpen(true)}
                onMouseLeave={() => setIsUserDropdownOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer py-2">
                  {customer.avatar ? (
                    <img src={`${API_BASE}${customer.avatar}`} alt="Avatar" className="w-7 h-7 rounded-full object-cover border" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-50 text-primary dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center"><User size={14}/></div>
                  )}
                  <span className="max-w-24 truncate hidden md:inline">{customer.name}</span>
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 py-1 z-50">
                    <Link to="/account" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200"><User size={14}/> Dashboard cá nhân</Link>
                    <Link to="/account?tab=orders" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200"><Package size={14}/> Đơn hàng của tôi</Link>
                    <button 
                      onClick={() => { logout(); navigate('/'); }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold text-red-500 cursor-pointer border-t dark:border-gray-700"
                    >
                      <LogOut size={14}/> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="bg-primary hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer">
                <User size={14} /> Đăng nhập
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white dark:bg-gray-800 h-full p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700 mb-6">
                <span className="text-sm font-black text-primary uppercase">Menu</span>
                <button onClick={() => setIsMobileOpen(false)} className="text-gray-400 hover:text-white p-1 rounded cursor-pointer"><X size={18} /></button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="relative mb-6">
                <input 
                  type="text" 
                  placeholder="Tìm sản phẩm..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-xs font-bold"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              </form>

              <nav className="flex flex-col gap-4 text-xs font-bold text-gray-700 dark:text-gray-200">
                <Link to="/" onClick={() => setIsMobileOpen(false)} className="hover:text-primary py-1.5 border-b dark:border-gray-700 flex items-center gap-1.5"><Home size={14}/> Trang chủ</Link>
                <Link to="/catalog" onClick={() => setIsMobileOpen(false)} className="hover:text-primary py-1.5 border-b dark:border-gray-700 flex items-center gap-1.5"><Package size={14}/> Tất cả sản phẩm</Link>
                
                {/* Mobile categories expandable list */}
                <div className="py-1">
                  <span className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider block mb-2">Danh mục</span>
                  <div className="space-y-2 max-h-56 overflow-y-auto pl-1">
                    {categoriesTree.map((cat: any) => (
                      <div key={cat._id} className="space-y-1">
                        <Link to={`/catalog?category=${cat._id}`} onClick={() => setIsMobileOpen(false)} className="block py-1 hover:text-primary text-xs font-bold">• {cat.name}</Link>
                        {cat.children?.map((sub: any) => (
                          <Link key={sub._id} to={`/catalog?category=${sub._id}`} onClick={() => setIsMobileOpen(false)} className="block pl-3 py-0.5 hover:text-primary text-[11px] text-gray-500 dark:text-gray-400">- {sub.name}</Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </nav>
            </div>

            {/* Mobile Footer actions */}
            <div className="pt-4 border-t dark:border-gray-700 flex flex-col gap-3">
              {customer ? (
                <>
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-primary flex items-center justify-center"><User size={14}/></div>
                    <div className="text-left">
                      <p className="text-xs font-extrabold text-gray-800 dark:text-white truncate max-w-[150px]">{customer.name}</p>
                      <p className="text-[10px] text-gray-400">Hạng: {customer.tier}</p>
                    </div>
                  </div>
                  <button onClick={() => { logout(); setIsMobileOpen(false); navigate('/'); }} className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-bold cursor-pointer">Đăng xuất</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsMobileOpen(false)} className="w-full py-2 bg-primary hover:bg-indigo-700 text-white rounded-lg text-xs font-bold text-center cursor-pointer">Đăng nhập</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
export default Header;
