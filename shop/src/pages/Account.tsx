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
  XCircle
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

  // Orders query
  const { data: ordersData } = useQuery({
    queryKey: ['shop-orders', activeTab],
    queryFn: () => shopService.getOrders(),
    enabled: !!customer
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

  // Address form with province/district/ward cascade
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const EMPTY_ADDR = { label: '', name: '', phone: '', province: '', district: '', ward: '', detail: '', isDefault: false };
  const [addrForm, setAddrForm] = useState<any>(EMPTY_ADDR);

  // Cascade location data
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Fetch provinces once on mount
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=1')
      .then(r => r.json())
      .then(data => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => setProvinces([]));
  }, []);

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
    if (!addrForm.name.trim() || !addrForm.phone.trim() || !addrForm.province ||
        !addrForm.district || !addrForm.ward || !addrForm.detail.trim()) {
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
                <img src={`${API_BASE}${profile.avatar}`} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-gray-800 dark:text-white">{addr.name}</span>
                      {addr.isDefault && (
                        <span className="bg-primary text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">Mặc định</span>
                      )}
                      {addr.label && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">{addr.label}</span>
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

                    {/* Province */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Tỉnh / Thành phố *</label>
                      <select onChange={handleProvinceChange}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                        <option value="">-- Chọn Tỉnh / Thành --</option>
                        {provinces.map((p: any) => (
                          <option key={p.code} value={String(p.code)}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* District */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Quận / Huyện *</label>
                      <select onChange={handleDistrictChange}
                        disabled={districts.length === 0 || loadingDistricts}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50">
                        <option value="">{loadingDistricts ? 'Đang tải...' : '-- Chọn Quận / Huyện --'}</option>
                        {districts.map((d: any) => (
                          <option key={d.code} value={String(d.code)}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Ward */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Phường / Xã *</label>
                      <select onChange={handleWardChange}
                        disabled={wards.length === 0 || loadingWards}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50">
                        <option value="">{loadingWards ? 'Đang tải...' : '-- Chọn Phường / Xã --'}</option>
                        {wards.map((w: any) => (
                          <option key={w.code} value={String(w.code)}>{w.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Street detail */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Số nhà, Tên đường *</label>
                      <input type="text" placeholder="Số 12, Đường Nguyễn Huệ"
                        value={addrForm.detail}
                        onChange={e => setAddrForm((p: any) => ({ ...p, detail: e.target.value }))}
                        className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>

                    {/* Preview full address */}
                    {(addrForm.detail || addrForm.ward || addrForm.district || addrForm.province) && (
                      <div className="sm:col-span-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3">
                        <p className="text-[10px] font-extrabold text-indigo-500 uppercase mb-1">Xem trước địa chỉ</p>
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
                    <button onClick={() => { setShowAddAddr(false); setAddrForm(EMPTY_ADDR); setDistricts([]); setWards([]); }}
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
                        const isDone = stepIdx <= currentIdx && order.orderStatus !== 'cancelled';
                        return (
                          <div key={step} className="flex flex-col items-center gap-1 relative">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 z-10 ${
                              isDone ? 'bg-primary border-primary text-white' : 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-600 text-gray-300'
                            }`}>
                              {isDone ? <Check size={10}/> : idx + 1}
                            </div>
                            {idx < 3 && (
                              <div className={`absolute top-3 left-1/2 w-full h-0.5 ${isDone && stepIdx < currentIdx ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'}`} />
                            )}
                            <p className="text-[8px] text-gray-400 font-semibold text-center leading-tight">{stepInfo.label}</p>
                          </div>
                        );
                      })}
                      {order.orderStatus === 'cancelled' && (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 bg-red-50 border-red-200 text-red-400">
                            <XCircle size={10}/>
                          </div>
                          <p className="text-[8px] text-red-400 font-semibold">Đã hủy</p>
                        </div>
                      )}
                    </div>

                    {/* Order items */}
                    <div className="space-y-2.5 border-t dark:border-gray-700 pt-3">
                      {order.items?.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg shrink-0 overflow-hidden">
                            {item.product?.images?.length > 0 ? (
                              <img src={`${API_BASE}${item.product.images[0]}`} alt="" className="w-full h-full object-cover" />
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
        </main>
      </div>
    </div>
  );
};
export default Account;
