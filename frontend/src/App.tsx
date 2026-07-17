import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Shipping from './pages/Shipping';
import Promotions from './pages/Promotions';
import LoyaltySettings from './pages/LoyaltySettings';
import FlashSales from './pages/FlashSales';
import MiniGame from './pages/MiniGame';
import ProtectedRoute from './components/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/loyalty" element={<LoyaltySettings />} />
            <Route path="/flash-sales" element={<FlashSales />} />
            <Route path="/minigame" element={<MiniGame />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
