import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { shopService } from '../services/shopService';
import { 
  User, 
  Package, 
  MapPin, 
  LogOut, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronRight,
  Clock,
  Truck,
  Star,
  AlertCircle,
  XCircle,
  RefreshCw,
  Lock
} from 'lucide-react';

const ORDER_STATUSES: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Chờ xác nhận',    color: 'text-yellow-600 bg-yellow-50 border-yellow-100', icon: <Clock size={12}/> },
  confirmed: { label: 'Đã xác nhận',     color: 'text-blue-600 bg-blue-50 border-blue-100',       icon: <Check size={12}/> },
  shipping:  { label: 'Đang giao hàng',  color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: <Truck size={12}/> },
  delivered: { label: 'Đã giao hàng',    color: 'text-green-600 bg-green-50 border-green-100',    icon: <Check size={12}/> },
  cancelled: { label: 'Đã hủy',          color: 'text-red-600 bg-red-50 border-red-100',          icon: <XCircle size={12}/> },
};

const TIER_COLORS: Record<string, string> = {
  'Đồng':   'text-orange-700 bg-orange-50 border-orange-200',
  'Bạc':    'text-gray-600 bg-gray-50 border-gray-200',
  'Vàng':   'text-yellow-700 bg-yellow-50 border-yellow-200',
  'Bạch Kim': 'text-purple-700 bg-purple-50 border-purple-200',
};

const API_BASE = 'http://localhost:5000';

export const Account = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customer, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const activeTab = searchParams.get('tab') || 'profile';
  const setTab = (tab: string) => {
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    if (!customer) navigate('/login');
  }, [customer]);

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('Vui lòng điền đầy đủ các thông tin!');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await shopService.changePassword({ oldPassword, newPassword });
      if (res.success) {
        alert('Đổi mật khẩu thành công!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Profile query
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['shop-profile'],
    queryFn: shopService.getProfile,
    enabled: !!customer
  });
  const profile = profileData?.data;

  // Addresses query
  const { data: addressesData, refetch: refetchAddresses } = useQuery({
    queryKey: ['shop-addresses'],
    queryFn: shopService.getAddresses,
    enabled: !!customer
  });
  const addresses = addressesData?.data || [];

  // Orders query with 5s polling for live status tracking
  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ['shop-orders', activeTab],
    queryFn: () => shopService.getOrders(),
    enabled: !!customer,
    refetchInterval: 5000
  });
  const orders = ordersData?.data || [];

  // Profile edit state
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);

  const handleSaveProfile = async () => {
    setSaveProfileLoading(true);
    try {
      await shopService.updateProfile(profileForm);
      await refetchProfile();
      setEditProfile(false);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Lỗi cập nhật hồ sơ');
    } finally {
      setSaveProfileLoading(false);
    }
  };

  // Address form with province/district/ward cascade and type
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const EMPTY_ADDR = { label: '', addressType: 'Sau sáp nhập', name: '', phone: '', province: '', district: '', ward: '', detail: '', isDefault: false };
  const [addrForm, setAddrForm] = useState<any>(EMPTY_ADDR);

  // Cascade location data
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // OSM street autocomplete suggestions
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch provinces once on mount
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=1')
      .then(r => r.json())
      .then(data => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => setProvinces([]));
  }, []);

  // Debounced fetch for street/road name from OpenStreetMap Nominatim
  useEffect(() => {
    if (addrForm.addressType === 'Sau sáp nhập' && (!addrForm.province || !addrForm.district || !addrForm.ward)) {
      setStreetSuggestions([]);
      return;
    }
    if (!addrForm.detail || addrForm.detail.trim().length < 2) {
      setStreetSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingStreets(true);
      try {
        const queryParts = [];
        if (addrForm.detail.trim()) queryParts.push(addrForm.detail.trim());
        if (addrForm.ward) queryParts.push(addrForm.ward);
        if (addrForm.district) queryParts.push(addrForm.district);
        if (addrForm.province) queryParts.push(addrForm.province);

        const q = queryParts.join(', ');
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=vn&limit=10`;
        
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'vi,en;q=0.9',
            'User-Agent': 'WebBanHangShopApp/1.0'
          }
        });
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const suggestions: string[] = [];
          data.forEach((item: any) => {
            const road = item.address?.road || item.address?.pedestrian;
            if (road && !suggestions.includes(road)) {
              suggestions.push(road);
            }
            // Fallback to name if it's classified as highway/road
            const name = item.name;
            if (name && !suggestions.includes(name) && (item.class === 'highway' || item.type === 'residential' || item.type === 'tertiary')) {
              suggestions.push(name);
            }
          });
          setStreetSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } else {
          setStreetSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching OSM street suggestions:", error);
        setStreetSuggestions([]);
      } finally {
        setLoadingStreets(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [addrForm.detail, addrForm.ward, addrForm.district, addrForm.province, addrForm.addressType]);

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = provinces.find(p => String(p.code) === code)?.name || '';
    setAddrForm((prev: any) => ({ ...prev, province: name, district: '', ward: '' }));
    setDistricts([]);
    setWards([]);
    if (!code) return;
    setLoadingDistricts(true);
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
      const data = await res.json();
      setDistricts(data.districts || []);
    } catch { setDistricts([]); }
    finally { setLoadingDistricts(false); }
  };

  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = districts.find(d => String(d.code) === code)?.name || '';
    setAddrForm((prev: any) => ({ ...prev, district: name, ward: '' }));
    setWards([]);
    if (!code) return;
    setLoadingWards(true);
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
      const data = await res.json();
      setWards(data.wards || []);
    } catch { setWards([]); }
    finally { setLoadingWards(false); }
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = wards.find(w => String(w.code) === code)?.name || '';
    setAddrForm((prev: any) => ({ ...prev, ward: name }));
  };

  const handleSaveAddress = async () => {
    if (!addrForm.name.trim() || !addrForm.phone.trim() || !addrForm.province.trim() ||
        !addrForm.district.trim() || !addrForm.ward.trim() || !addrForm.detail.trim()) {
      alert('Vui lòng điền đầy đủ: Họ tên, Số điện thoại, Tỉnh/Thành, Quận/Huyện, Phường/Xã và Địa chỉ chi tiết');
      return;
    }
    setSavingAddr(true);
    try {
      await shopService.addAddress(addrForm);
      await refetchAddresses();
      setShowAddAddr(false);
      setAddrForm(EMPTY_ADDR);
      setDistricts([]);
      setWards([]);
      setStreetSuggestions([]);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Lỗi lưu địa chỉ');
    } finally {
      setSavingAddr(false);
    }
  };


  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Xác nhận xóa địa chỉ này?')) return;
    try {
      await shopService.deleteAddress(id);
      await refetchAddresses();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Lỗi xóa địa chỉ');
    }
  };

  // Cancel order
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const handleCancelOrder = async (id: string) => {
    if (!confirm('Xác nhận hủy đơn hàng này?')) return;
    setCancelingOrderId(id);
    try {
      await shopService.cancelOrder(id);
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Không thể hủy đơn');
    } finally {
      setCancelingOrderId(null);
    }
  };

  if (!customer) return null;

  const TABS = [
    { key: 'profile', label: 'Hồ sơ cá nhân', icon: <User size={14}/> },
    { key: 'addresses', label: 'Địa chỉ giao hàng', icon: <MapPin size={14}/> },
    { key: 'orders', label: 'Đơn hàng của tôi', icon: <Package size={14}/> },
    { key: 'security', label: 'Đổi mật khẩu', icon: <Lock size={14}/> },
  ];

  return (
    <div className="space-y-6 pb-16">
      <h1 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">Dashboard cá nhân</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          
          {/* Customer card */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col items-center text-center gap-2.5">
              {profile?.avatar ? (
                <img src={profile.avatar?.startsWith('http') ? profile.avatar : `${API_BASE}${profile.avatar}`} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 text-primary flex items-center justify-center text-2xl font-black">
                  {customer.name?.slice(0, 1)}
                </div>
              )}
              <div>
                <h3 className="text-sm font-black text-gray-800 dark:text-white">{customer.name}</h3>
                <p className="text-[10px] text-gray-400 font-medium">{customer.phone}</p>
              </div>
              <span className={`text-[10px] font-extrabold border px-2.5 py-1 rounded-full flex items-center gap-1 ${TIER_COLORS[customer.tier] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                <Star size={10} fill="currentColor"/> Hạng {customer.tier} · {customer.loyaltyPoints} điểm
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-4 py-3.5 text-xs font-bold cursor-pointer transition-all border-l-2 ${
                  activeTab === tab.key
                    ? 'border-primary bg-indigo-50 dark:bg-indigo-950/30 text-primary'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 text-xs font-bold cursor-pointer transition-colors border-l-2 border-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border-t dark:border-gray-700"
            >
              <LogOut size={14}/> Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <main className="lg:col-span-3 space-y-5">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-800 dark:text-white">Thông tin cá nhân</h3>
                <button
                  onClick={() => { setEditProfile(!editProfile); setProfileForm({ name: profile?.name, email: profile?.email, address: profile?.address, gender: profile?.gender }); }}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Edit2 size={12}/> {editProfile ? 'Hủy' : 'Chỉnh sửa'}
                </button>
              </div>

              {editProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Họ tên', key: 'name', type: 'text', placeholder: 'Nguyễn Văn A' },
                      { label: 'Email', key: 'email', type: 'email', placeholder: 'you@email.com' },
                      { label: 'Địa chỉ', key: 'address', type: 'text', placeholder: '123 Đường ABC...' },
                    ].map(field => (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">{field.label}</label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={profileForm[field.key] || ''}
                          onChange={e => setProfileForm((prev: any) => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Giới tính</label>
                      <select
                        value={profileForm.gender || ''}
                        onChange={e => setProfileForm((prev: any) => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      >
                        <option value="">-- Chọn giới tính --</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saveProfileLoading}
                      className="px-6 py-2.5 bg-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all disabled:opacity-60"
                    >
                      {saveProfileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                    <button
                      onClick={() => setEditProfile(false)}
                      className="px-4 py-2.5 border dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Họ tên', value: profile?.name },
                    { label: 'Số điện thoại', value: profile?.phone },
                    { label: 'Email', value: profile?.email || '—' },
                    { label: 'Giới tính', value: profile?.gender || '—' },
                    { label: 'Hạng thành viên', value: profile?.tier },
                    { label: 'Điểm tích lũy', value: `${profile?.loyaltyPoints || 0} điểm` },
                    { label: 'Tổng chi tiêu', value: `${(profile?.totalSpent || 0).toLocaleString()}đ` },
                    { label: 'Địa chỉ', value: profile?.address || '—' },
                  ].map(item => (
                    <div key={item.label} className="space-y-0.5">
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase">{item.label}</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADDRESSES TAB */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">

              {addresses.map((addr: any) => (
                <div key={addr._id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-gray-800 dark:text-white">{addr.name}</span>
                      {addr.isDefault && (
                        <span className="bg-primary text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">Mặc định</span>
                      )}
                      {addr.label && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">{addr.label}</span>
                      )}
                      {addr.addressType && (
                        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">{addr.addressType}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{addr.phone}</p>
                    <p className="text-[10px] text-gray-400">
                      {[addr.detail, addr.ward, addr.district, addr.province].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDeleteAddress(addr._id)} className="text-red-400 hover:text-red-600 cursor-pointer p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add address form */}
              {showAddAddr ? (
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase">Thêm địa chỉ mới</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* Pre-merger vs Post-merger selector */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Loại địa chỉ hành chính *</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-200">
                          <input
                            type="radio"
                            name="addressType"
                            checked={addrForm.addressType === 'Sau sáp nhập'}
                            onChange={() => setAddrForm((p: any) => ({ ...p, addressType: 'Sau sáp nhập', province: '', district: '', ward: '' }))}
                            className="cursor-pointer font-bold"
                          />
                          Sau sáp nhập (Hiện tại / Mới)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-200">
                          <input
                            type="radio"
                            name="addressType"
                            checked={addrForm.addressType === 'Trước sáp nhập'}
                            onChange={() => setAddrForm((p: any) => ({ ...p, addressType: 'Trước sáp nhập', province: '', district: '', ward: '' }))}
                            className="cursor-pointer font-bold"
                          />
                          Trước sáp nhập (Cũ / Lịch sử)
                        </label>
                      </div>
                    </div>

                    {/* Label */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Nhãn (Nhà, Cty...)</label>
                      <input type="text" placeholder="Nhà riêng"
                        value={addrForm.label}
                        onChange={e => setAddrForm((p: any) => ({ ...p, label: e.target.value }))}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>

                    {/* Recipient Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Họ tên người nhận *</label>
                      <input type="text" placeholder="Nguyễn Văn A"
                        value={addrForm.name}
                        onChange={e => setAddrForm((p: any) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số điện thoại *</label>
                      <input type="tel" placeholder="0987654321"
                        value={addrForm.phone}
                        onChange={e => setAddrForm((p: any) => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>

                    {/* Province Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Tỉnh / Thành phố *</label>
                      {addrForm.addressType === 'Sau sáp nhập' ? (
                        <select
                          value={provinces.find(p => p.name === addrForm.province)?.code || ''}
                          onChange={handleProvinceChange}
                          className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                          <option value="">-- Chọn Tỉnh / Thành --</option>
                          {provinces.map((p: any) => (
                            <option key={p.code} value={String(p.code)}>{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Thành phố Hồ Chí Minh"
                          value={addrForm.province}
                          onChange={e => setAddrForm((p: any) => ({ ...p, province: e.target.value }))}
                          className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>

                    {/* District Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Quận / Huyện *</label>
                      {addrForm.addressType === 'Sau sáp nhập' ? (
                        <select
                          value={districts.find(d => d.name === addrForm.district)?.code || ''}
                          onChange={handleDistrictChange}
                          disabled={districts.length === 0 || loadingDistricts}
                          className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50">
                          <option value="">{loadingDistricts ? 'Đang tải...' : '-- Chọn Quận / Huyện --'}</option>
                          {districts.map((d: any) => (
                            <option key={d.code} value={String(d.code)}>{d.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Quận 2, Quận 9..."
                          value={addrForm.district}
                          onChange={e => setAddrForm((p: any) => ({ ...p, district: e.target.value }))}
                          className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>

                    {/* Ward Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Phường / Xã *</label>
                      {addrForm.addressType === 'Sau sáp nhập' ? (
                        <select
                          value={wards.find(w => w.name === addrForm.ward)?.code || ''}
                          onChange={handleWardChange}
                          disabled={wards.length === 0 || loadingWards}
                          className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50">
                          <option value="">{loadingWards ? 'Đang tải...' : '-- Chọn Phường / Xã --'}</option>
                          {wards.map((w: any) => (
                            <option key={w.code} value={String(w.code)}>{w.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Phường Long Bình..."
                          value={addrForm.ward}
                          onChange={e => setAddrForm((p: any) => ({ ...p, ward: e.target.value }))}
                          className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>

                    {/* Street detail with OSM Autocomplete */}
                    <div className="space-y-1.5 relative">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase flex justify-between items-center">
                        <span>Số nhà, Tên đường *</span>
                        {loadingStreets && <span className="text-[9px] text-primary animate-pulse normal-case font-normal">Đang tìm đường...</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="Số 12, Đường Nguyễn Huệ"
                        value={addrForm.detail}
                        onChange={e => {
                          setAddrForm((p: any) => ({ ...p, detail: e.target.value }));
                          setShowSuggestions(true);
                        }}
                        onFocus={() => {
                          if (streetSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        onBlur={() => {
                          // delay closing suggestions to allow clicks to register
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      
                      {/* OSM Autocomplete Dropdown */}
                      {showSuggestions && streetSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                          {streetSuggestions.map((st, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setAddrForm((p: any) => ({ ...p, detail: st }));
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-gray-700 dark:text-gray-200 cursor-pointer font-medium block truncate"
                            >
                              📍 {st}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Preview full address */}
                    {(addrForm.detail || addrForm.ward || addrForm.district || addrForm.province) && (
                      <div className="sm:col-span-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3">
                        <p className="text-[10px] font-extrabold text-indigo-500 uppercase mb-1">Xem trước địa chỉ ({addrForm.addressType})</p>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                          {[addrForm.detail, addrForm.ward, addrForm.district, addrForm.province].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Default checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
                      <input type="checkbox"
                        checked={addrForm.isDefault}
                        onChange={e => setAddrForm((p: any) => ({ ...p, isDefault: e.target.checked }))}
                        className="rounded cursor-pointer" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Đặt làm địa chỉ mặc định</span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleSaveAddress} disabled={savingAddr}
                      className="px-5 py-2.5 bg-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors disabled:opacity-60">
                      {savingAddr ? 'Đang lưu...' : 'Lưu địa chỉ'}
                    </button>
                    <button onClick={() => { setShowAddAddr(false); setAddrForm(EMPTY_ADDR); setDistricts([]); setWards([]); setStreetSuggestions([]); }}
                      className="px-4 py-2.5 border dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold cursor-pointer">
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddAddr(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-400 hover:border-primary hover:text-primary cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14}/> Thêm địa chỉ mới
                </button>
              )}
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              
              {/* Tab Header with Manual Refresh */}
              <div className="flex justify-between items-center bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Theo dõi đơn hàng</h3>
                  <p className="text-[10px] text-gray-400">Tự động cập nhật hành trình mỗi 5 giây</p>
                </div>
                <button
                  onClick={() => refetchOrders()}
                  className="px-3 py-2 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw size={12} className="animate-spin-slow text-primary" />
                  Cập nhật hành trình
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl py-16 text-center space-y-3">
                  <Package size={40} className="mx-auto text-gray-200 dark:text-gray-700" />
                  <p className="text-xs font-bold text-gray-400">Bạn chưa có đơn hàng nào</p>
                  <Link to="/catalog" className="text-primary text-xs font-extrabold hover:underline">Khám phá sản phẩm ngay →</Link>
                </div>
              ) : orders.map((order: any) => {
                const statusInfo = ORDER_STATUSES[order.orderStatus] || { label: order.orderStatus, color: 'text-gray-500 bg-gray-50 border-gray-100', icon: <Clock size={12}/> };
                
                return (
                  <div key={order._id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 space-y-4">
                    
                    {/* Order header */}
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-gray-400 font-semibold">Mã đơn hàng</p>
                        <p className="font-mono text-xs font-extrabold text-primary">{order.orderCode}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] text-gray-400 font-semibold">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold border px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Order stepper / timeline */}
                    <div className="grid grid-cols-5 gap-1">
                      {['pending', 'confirmed', 'shipping', 'delivered'].map((step, idx) => {
                        const stepInfo = ORDER_STATUSES[step];
                        const currentIdx = Object.keys(ORDER_STATUSES).indexOf(order.orderStatus);
                        const stepIdx = Object.keys(ORDER_STATUSES).indexOf(step);
                        
                        const isCompleted = stepIdx < currentIdx && order.orderStatus !== 'cancelled';
                        const isCurrent = stepIdx === currentIdx && order.orderStatus !== 'cancelled';
                        const isPending = stepIdx > currentIdx || order.orderStatus === 'cancelled';

                        let circleClass = "";
                        let circleContent = null;

                        if (isCompleted) {
                          circleClass = "bg-green-500 border-green-500 text-white";
                          circleContent = <Check size={10}/>;
                        } else if (isCurrent) {
                          circleClass = "bg-primary border-primary text-white ring-4 ring-primary/20 animate-pulse";
                          circleContent = idx + 1;
                        } else {
                          circleClass = "bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-600 text-gray-400";
                          circleContent = idx + 1;
                        }

                        let lineClass = "bg-gray-100 dark:bg-gray-700";
                        if (order.orderStatus !== 'cancelled') {
                          if (stepIdx < currentIdx) {
                            lineClass = "bg-green-500";
                          } else if (stepIdx === currentIdx) {
                            lineClass = "bg-primary/30";
                          }
                        }

                        return (
                          <div key={step} className="flex flex-col items-center gap-1.5 relative">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 z-10 transition-all duration-300 ${circleClass}`}>
                              {circleContent}
                            </div>
                            {idx < 3 && (
                              <div className={`absolute top-3 left-1/2 w-full h-0.5 transition-all duration-300 ${lineClass}`} />
                            )}
                            <p className={`text-[8px] font-bold text-center leading-tight ${isCurrent ? 'text-primary' : 'text-gray-400'}`}>
                              {stepInfo.label}
                            </p>
                          </div>
                        );
                      })}

                      {order.orderStatus === 'cancelled' && (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 bg-red-500 border-red-500 text-white">
                            <XCircle size={10}/>
                          </div>
                          <p className="text-[8px] text-red-500 font-bold">Đã hủy</p>
                        </div>
                      )}
                    </div>

                    {/* Order items */}
                    <div className="space-y-2.5 border-t dark:border-gray-700 pt-3">
                      {order.items?.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg shrink-0 overflow-hidden">
                            {item.product?.images?.length > 0 ? (
                               <img src={item.product.images[0]?.startsWith('http') ? item.product.images[0] : `${API_BASE}${item.product.images[0]}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={12}/></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200 line-clamp-1">{item.product?.name || item.productName}</p>
                            <p className="text-[9px] text-gray-400">x{item.qty} · {item.price?.toLocaleString()}đ</p>
                          </div>
                        </div>
                      ))}
                      {order.items?.length > 2 && (
                        <p className="text-[10px] text-gray-400">+ {order.items.length - 2} sản phẩm khác</p>
                      )}
                    </div>

                    {/* Order total + actions */}
                    <div className="border-t dark:border-gray-700 pt-3 flex justify-between items-center flex-wrap gap-3">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-gray-400 font-semibold">Tổng thanh toán</p>
                        <p className="text-sm font-extrabold text-primary dark:text-indigo-400">{order.totalAmount?.toLocaleString()}đ</p>
                      </div>
                      {(order.orderStatus === 'pending' || order.orderStatus === 'confirmed') && (
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          disabled={cancelingOrderId === order._id}
                          className="text-xs font-bold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 px-4 py-2 rounded-xl cursor-pointer transition-colors disabled:opacity-60"
                        >
                          {cancelingOrderId === order._id ? 'Đang hủy...' : 'Hủy đơn'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={16} className="text-primary"/> Đổi mật khẩu
                </h2>
                <p className="text-[10px] text-gray-400 font-medium">Bảo vệ tài khoản của bạn bằng cách sử dụng mật khẩu mạnh</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mật khẩu hiện tại</label>
                  <input 
                    type="password" 
                    value={oldPassword} 
                    onChange={e => setOldPassword(e.target.value)} 
                    placeholder="Nhập mật khẩu hiện tại" 
                    className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-bold transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mật khẩu mới</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Mật khẩu mới (ít nhất 6 ký tự)" 
                    className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-bold transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Nhập lại mật khẩu mới" 
                    className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-bold transition-all"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="px-6 py-2.5 bg-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default Account;
