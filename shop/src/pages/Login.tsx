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

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
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

  // Forgot password fields
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOTP, setForgotOTP] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [testOtpCode, setTestOtpCode] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPhone) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }
    setIsSendingOTP(true);
    setError('');
    try {
      const res = await shopService.sendOTP({ phone: forgotPhone });
      if (res.success) {
        setOtpSent(true);
        setTestOtpCode(res.otpCode || '');
        alert(`Mã xác thực OTP đã được gửi! (Mã thử nghiệm: ${res.otpCode})`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại!');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPhone || !forgotOTP || !forgotNewPassword || !forgotConfirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Xác nhận mật khẩu mới không trùng khớp');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await shopService.forgotPassword({
        phone: forgotPhone,
        otpCode: forgotOTP,
        newPassword: forgotNewPassword
      });
      if (res.success) {
        alert('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới!');
        setForgotPhone('');
        setForgotOTP('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setOtpSent(false);
        setTestOtpCode('');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại!');
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
            {mode === 'login' ? 'Chào mừng trở lại' : mode === 'register' ? 'Tạo tài khoản mới' : 'Khôi phục mật khẩu'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'login' 
              ? 'Đăng nhập để mua hàng và theo dõi đơn của bạn' 
              : mode === 'register'
              ? 'Đăng ký để nhận ưu đãi thành viên hấp dẫn'
              : 'Nhập thông tin xác minh email & số điện thoại để đặt lại mật khẩu'}
          </p>
        </div>

        {/* Context banner when coming from cart/checkout */}
        {mode !== 'forgot_password' && (redirectTo === '/cart' || redirectTo === '/checkout' || redirectTo?.includes('/product')) && (
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
        {mode === 'forgot_password' ? (
          <div className="text-left">
            <button 
              onClick={() => { setMode('login'); setError(''); }} 
              className="text-xs font-bold text-gray-500 hover:text-gray-705 dark:hover:text-gray-300 flex items-center gap-1 cursor-pointer"
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        ) : (
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
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-600 dark:text-red-400 font-semibold">
            {error}
          </div>
        )}

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="space-y-1.5 text-left">
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

            <div className="space-y-1.5 text-left">
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

            <div className="text-right">
              <button 
                type="button" 
                onClick={() => { setMode('forgot_password'); setError(''); }} 
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Quên mật khẩu?
              </button>
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

        {/* Forgot password form */}
        {mode === 'forgot_password' && (
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số điện thoại tài khoản *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-3 text-gray-400"/>
                    <input
                      type="tel"
                      placeholder="0987654321"
                      value={forgotPhone}
                      onChange={e => setForgotPhone(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOTP}
                  className="w-full py-3 bg-primary hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSendingOTP ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Đang gửi mã...</>
                  ) : (
                    <>Gửi mã xác thực OTP</>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {/* OTP Test Banner */}
                {testOtpCode && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-xs text-green-700 dark:text-green-300 font-bold text-left space-y-1">
                    <p>✓ Đã tạo mã OTP mô phỏng thành công!</p>
                    <p className="text-sm">Mã OTP của bạn: <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-green-300 select-all font-mono text-primary">{testOtpCode}</span></p>
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số điện thoại</label>
                  <input
                    type="tel"
                    value={forgotPhone}
                    disabled
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Nhập mã OTP xác thực *</label>
                  <input
                    type="text"
                    placeholder="Nhập mã OTP gồm 6 chữ số"
                    value={forgotOTP}
                    onChange={e => setForgotOTP(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Mật khẩu mới *</label>
                  <input
                    type="password"
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={forgotConfirmPassword}
                    onChange={e => setForgotConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setForgotOTP(''); setTestOtpCode(''); }}
                    className="px-4 py-3 bg-gray-100 dark:bg-gray-750 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-extrabold cursor-pointer transition-all"
                  >
                    Gửi lại mã
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 bg-primary hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Đang đặt lại...</>
                    ) : (
                      <>Đặt lại mật khẩu</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
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
