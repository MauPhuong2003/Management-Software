import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Account from './pages/Account';
import Promotions from './pages/Promotions';
import { useAuthStore } from './store/authStore';

// Protected route wrapper - saves current path to redirect back after login
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { customer } = useAuthStore();
  const location = useLocation();
  if (!customer) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
};

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
