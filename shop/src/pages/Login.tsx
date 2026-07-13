import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { shopService } from '../services/shopService';
import { 
  User, 
  Lock, 
  Phone,
  Eye, 
  EyeOff,
  ArrowRight,
  Sparkles,
  LogIn,
  ShoppingBag
} from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  // Redirect back to original page after login (e.g. /cart or /checkout)
  const redirectTo = (location.state as any)?.from || '/';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginKey, setLoginKey] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPwd, setRegPwd] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await shopService.login({ loginKey, password });
      if (res.success) {
        setAuth(res.customer, res.token);
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await shopService.register({ 
        name: regName, 
        phone: regPhone, 
        email: regEmail || undefined, 
        password: regPwd 
      });
      if (res.success) {
        setAuth(res.customer, res.token);
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">
            {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'login' ? 'Đăng nhập để mua hàng và theo dõi đơn của bạn' : 'Đăng ký để nhận ưu đãi thành viên hấp dẫn'}
          </p>
        </div>

        {/* Context banner when coming from cart/checkout */}
        {(redirectTo === '/cart' || redirectTo === '/checkout' || redirectTo?.includes('/product')) && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3.5 flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center shrink-0">
              <ShoppingBag size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-amber-700 dark:text-amber-300">Bạn cần đăng nhập để tiếp tục</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                {redirectTo === '/cart' && 'Đăng nhập để xem giỏ hàng và tiến hành thanh toán'}
                {redirectTo === '/checkout' && 'Đăng nhập để hoàn tất đặt hàng của bạn'}
                {redirectTo?.includes('/product') && 'Đăng nhập để thêm sản phẩm vào giỏ hàng'}
              </p>
              <button onClick={() => { setMode('register'); setError(''); }} className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 underline mt-1 cursor-pointer">
                Chưa có tài khoản? Đăng ký miễn phí →
              </button>
            </div>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl grid grid-cols-2 gap-1">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
              mode === 'login' 
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-600 dark:text-red-400 font-semibold">
            {error}
          </div>
        )}

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số điện thoại hoặc Email</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-3 text-gray-400"/>
                <input
                  type="text"
                  placeholder="0987654321 hoặc you@email.com"
                  value={loginKey}
                  onChange={e => setLoginKey(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Mật khẩu</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-3 text-gray-400"/>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-2.5 text-gray-400 cursor-pointer">
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Đang đăng nhập...</>
              ) : (
                <><LogIn size={14}/> Đăng nhập</>
              )}
            </button>
          </form>
        )}

        {/* Register form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Họ và tên *</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-3 text-gray-400"/>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số điện thoại *</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-3 text-gray-400"/>
                  <input
                    type="tel"
                    placeholder="0987654321"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Email (tuỳ chọn)</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Mật khẩu *</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-3 text-gray-400"/>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Tối thiểu 6 ký tự"
                  value={regPwd}
                  onChange={e => setRegPwd(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-9 pr-10 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-2.5 text-gray-400 cursor-pointer">
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Đang đăng ký...</>
              ) : (
                <><ArrowRight size={14}/> Đăng ký ngay</>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400">
          Bằng cách đăng nhập/đăng ký, bạn đồng ý với{' '}
          <Link to="#" className="text-primary hover:underline font-bold">Điều khoản sử dụng</Link>{' '}
          và{' '}
          <Link to="#" className="text-primary hover:underline font-bold">Chính sách bảo mật</Link>
        </p>
      </div>
    </div>
  );
};
export default Login;
