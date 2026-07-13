import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  List, 
  MapPin, 
  Truck, 
  Users, 
  Tag, 
  Settings, 
  LogOut, 
  Star, 
  Menu, 
  X, 
  Megaphone, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';

const MENU_ITEMS = [
  { path: '/', name: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { path: '/pos', name: 'POS Bán hàng', icon: ShoppingCart, module: 'pos' },
  { path: '/orders', name: 'Đơn hàng', icon: List, module: 'orders' },
  { 
    name: 'Sản phẩm', 
    icon: Package, 
    module: 'products',
    children: [
      { path: '/products', name: 'Danh sách sản phẩm', module: 'products' },
      { path: '/categories', name: 'Danh mục', module: 'categories' }
    ]
  },
  { path: '/warehouses', name: 'Kho bãi', icon: MapPin, module: 'warehouses' },
  { path: '/shipping', name: 'Vận chuyển', icon: Truck, module: 'shipping' },
  { 
    name: 'Khách hàng', 
    icon: Users, 
    module: 'customers',
    children: [
      { path: '/customers', name: 'Danh sách khách hàng', module: 'customers' },
      { path: '/loyalty', name: 'Loyalty / Hạng KH', module: 'loyalty' }
    ]
  },
  { 
    name: 'Chiến dịch', 
    icon: Megaphone, 
    module: 'promotions',
    children: [
      { path: '/promotions', name: 'Khuyến mãi', module: 'promotions' },
      { path: '/flash-sales', name: 'Flash Sale', module: 'promotions' }
    ]
  },
  { 
    name: 'Cài đặt', 
    icon: Settings, 
    module: 'settings',
    children: [
      { path: '/settings?tab=general', name: 'Thông tin cửa hàng', module: 'settings' },
      { path: '/settings?tab=roles', name: 'Phân quyền tài khoản', module: 'settings' },
      { path: '/settings?tab=users', name: 'Tài khoản nhân viên', module: 'settings' }
    ]
  },
];

const ProtectedRoute = () => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const hasPermission = useAuthStore(state => state.hasPermission);
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Compute active path comparison value
  const currentActivePath = location.pathname + (location.search || (location.pathname === '/settings' ? '?tab=general' : ''));

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, location.search]);

  // Auto-expand active submenus on route change
  useEffect(() => {
    const activeSubmenu = MENU_ITEMS.find(item => 
      item.children?.some(child => currentActivePath === child.path)
    );
    if (activeSubmenu) {
      setOpenSubmenus(prev => ({ ...prev, [activeSubmenu.name]: true }));
    }
  }, [currentActivePath]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Frontend routing firewall: check if the user is allowed to access the current path
  const currentPath = location.pathname;
  let isAllowed = true;

  if (currentPath === '/') isAllowed = hasPermission('dashboard', 'read');
  else if (currentPath.startsWith('/pos')) isAllowed = hasPermission('pos', 'read');
  else if (currentPath.startsWith('/orders')) isAllowed = hasPermission('orders', 'read');
  else if (currentPath.startsWith('/products')) isAllowed = hasPermission('products', 'read');
  else if (currentPath.startsWith('/categories')) isAllowed = hasPermission('categories', 'read');
  else if (currentPath.startsWith('/warehouses')) isAllowed = hasPermission('warehouses', 'read');
  else if (currentPath.startsWith('/shipping')) isAllowed = hasPermission('shipping', 'read');
  else if (currentPath.startsWith('/customers')) isAllowed = hasPermission('customers', 'read');
  else if (currentPath.startsWith('/loyalty')) isAllowed = hasPermission('loyalty', 'read');
  else if (currentPath.startsWith('/promotions')) isAllowed = hasPermission('promotions', 'read');
  else if (currentPath.startsWith('/flash-sales')) isAllowed = hasPermission('promotions', 'read');
  else if (currentPath.startsWith('/settings')) isAllowed = hasPermission('settings', 'read');

  if (!isAllowed) {
    // If blocked from dashboard, check if there's any other route they can access, or redirect.
    const allowedPath = MENU_ITEMS.map(item => {
      if (item.children) {
        return item.children.find(child => hasPermission(child.module, 'read'))?.path;
      }
      return hasPermission(item.module, 'read') ? item.path : null;
    }).filter(Boolean)[0];

    if (allowedPath && allowedPath !== currentPath) {
      return <Navigate to={allowedPath} replace />;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border text-center space-y-4">
          <h2 className="text-xl font-bold text-red-500">Quyền truy cập bị từ chối</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tài khoản của bạn không được cấp quyền truy cập vào phân hệ này.</p>
          <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm w-full cursor-pointer">
            Đăng xuất & Đăng nhập tài khoản khác
          </button>
        </div>
      </div>
    );
  }

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Filter sidebar navigation items based on user permissions
  const filteredMenuItems = MENU_ITEMS.map(item => {
    if (item.children) {
      const activeChildren = item.children.filter(child => hasPermission(child.module, 'read'));
      if (activeChildren.length === 0) return null;
      return { ...item, children: activeChildren };
    }
    const hasPerm = hasPermission(item.module, 'read');
    return hasPerm ? item : null;
  }).filter(Boolean) as any[];

  const renderNavItems = (items: any[]) => {
    return items.map((item) => {
      const Icon = item.icon;
      const hasChildren = !!item.children;
      const isOpen = openSubmenus[item.name];

      if (hasChildren) {
        const isChildActive = item.children.some((c: any) => currentActivePath === c.path);
        
        return (
          <div key={item.name} className="space-y-1">
            <button
              onClick={() => toggleSubmenu(item.name)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold cursor-pointer text-left text-sm ${
                isChildActive 
                  ? 'text-primary bg-primary/5 dark:bg-primary/10' 
                  : 'text-gray-650 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} />
                <span className="font-semibold">{item.name}</span>
              </div>
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            
            {isOpen && (
              <div className="pl-9 space-y-1 transition-all">
                {item.children.map((child: any) => {
                  const isChildPathActive = currentActivePath === child.path;
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`flex items-center px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        isChildPathActive
                          ? 'text-primary bg-primary/10 font-extrabold shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary'
                      }`}
                    >
                      {child.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      const isActive = currentActivePath === item.path || (item.path !== '/' && currentActivePath.startsWith(item.path));
      return (
        <Link 
          key={item.path}
          to={item.path}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            isActive 
              ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold' 
              : 'text-gray-650 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary font-bold'
          }`}
        >
          <Icon size={20} />
          <span className="font-semibold text-sm">{item.name}</span>
        </Link>
      );
    });
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col z-50 transition-transform duration-300 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Package size={22} /> SaaS Admin
          </h1>
          <button onClick={() => setIsMobileOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {renderNavItems(filteredMenuItems)}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.username || user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors font-medium cursor-pointer"
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-col hidden md:flex sticky top-0 h-screen shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Package /> SaaS Admin
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {renderNavItems(filteredMenuItems)}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.username || user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors font-medium cursor-pointer"
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile Header Bar */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-350 cursor-pointer"
              title="Mở menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Package className="text-primary" size={20}/> SaaS Admin
            </h1>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs select-none">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </header>
        <div className="p-6 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedRoute;
