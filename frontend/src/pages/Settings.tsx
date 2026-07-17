import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { settingService } from '../services/settingService';
import { uploadService } from '../services/uploadService';
import { Settings as SettingsIcon, Save, Shield, Globe, Plus, Trash2, Upload, X, Users, Edit2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'pos', name: 'POS Bán hàng' },
  { id: 'orders', name: 'Đơn hàng' },
  { id: 'products', name: 'Sản phẩm' },
  { id: 'categories', name: 'Danh mục' },
  { id: 'warehouses', name: 'Kho bãi' },
  { id: 'shipping', name: 'Vận chuyển' },
  { id: 'customers', name: 'Khách hàng' },
  { id: 'loyalty', name: 'Loyalty / Hạng KH' },
  { id: 'promotions', name: 'Khuyến mãi' },
  { id: 'settings', name: 'Cài đặt' }
];

const PERMISSIONS = [
  { id: 'read', name: 'Xem (Read)' },
  { id: 'create', name: 'Thêm (Create)' },
  { id: 'update', name: 'Sửa (Update)' },
  { id: 'delete', name: 'Xoá (Delete)' },
  { id: 'export', name: 'Xuất file (Export)' }
];

const Settings = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'general' | 'roles' | 'users') || 'general';
  const setActiveTab = (tab: 'general' | 'roles' | 'users') => {
    setSearchParams({ tab });
  };

  // Query: General Settings
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingService.getSettings
  });

  // Query: Roles list
  const { data: rolesData, isLoading: isRolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: settingService.getRoles
  });

  // Query: Employee list
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: settingService.getUsers,
    enabled: activeTab === 'users' || activeTab === 'roles' // load if needed
  });

  // Local state: General settings form
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [facebook, setFacebook] = useState('');
  const [logo, setLogo] = useState('');
  const [banners, setBanners] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<{ branchName: string; address: string; openingHours: string; lat?: number; lon?: number; }[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Address autocomplete suggestions states
  const [activeAddressIdx, setActiveAddressIdx] = useState<number | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  const fetchSuggestions = async (idx: number, query: string) => {
    if (!query || query.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=vn&limit=8`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'vi,en;q=0.9',
          'User-Agent': 'AdminStoreSettingsApp/1.0'
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAddressSuggestions(data);
        setActiveAddressIdx(idx);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBranchAddressChange = (idx: number, value: string) => {
    handleBranchUpdate(idx, 'address', value);

    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      fetchSuggestions(idx, value);
    }, 550);
    setSearchTimeout(timeout);
  };

  // Helpers for Store Branches
  const handleAddBranch = () => {
    setAddresses(prev => [...prev, { branchName: '', address: '', openingHours: '08:00 - 22:00', lat: undefined, lon: undefined }]);
  };

  const handleBranchUpdate = (index: number, key: string, value: any) => {
    setAddresses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const handleRemoveBranch = (index: number) => {
    setAddresses(prev => prev.filter((_, idx) => idx !== index));
  };

  // Drag and drop states
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [isBannerDragging, setIsBannerDragging] = useState(false);

  // Local state: Selected role for editing permissions matrix
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Local state: Employee management
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('active');

  // Sync settings query data into local state
  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      setStoreName(s.storeName || '');
      setEmail(s.contact?.email || '');
      setPhone(s.contact?.phone || '');
      setFacebook(s.contact?.facebook || '');
      setLogo(s.logo || '');
      setBanners(s.banners || []);
      setAddresses(s.addresses || []);
      setBankName(s.bankInfo?.bankName || '');
      setAccountHolder(s.bankInfo?.accountHolder || '');
      setAccountNumber(s.bankInfo?.accountNumber || '');
    }
  }, [settingsData]);

  // Sync selected role
  useEffect(() => {
    if (rolesData?.data && rolesData.data.length > 0) {
      if (!selectedRoleId) {
        setSelectedRoleId(rolesData.data[0]._id);
        setSelectedRole(rolesData.data[0]);
      } else {
        const updatedSelected = rolesData.data.find((r: any) => r._id === selectedRoleId);
        if (updatedSelected) setSelectedRole(updatedSelected);
      }
    }
  }, [rolesData, selectedRoleId]);

  // Image Upload Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const res = await uploadService.uploadImage(e.target.files[0]);
        setLogo(res.data.url);
      } catch (err) {
        alert('Không thể upload logo');
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const res = await uploadService.uploadImage(e.target.files[0]);
        setBanners(prev => [...prev, res.data.url]);
      } catch (err) {
        alert('Không thể upload banner');
      }
    }
  };

  const removeBanner = (index: number) => {
    setBanners(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and Drop Logo handlers
  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(true);
  };

  const handleLogoDragLeave = () => {
    setIsLogoDragging(false);
  };

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return alert('Chỉ chấp nhận file hình ảnh');
      try {
        const res = await uploadService.uploadImage(file);
        setLogo(res.data.url);
      } catch (err) {
        alert('Không thể upload logo');
      }
    }
  };

  // Drag and Drop Banner handlers
  const handleBannerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(true);
  };

  const handleBannerDragLeave = () => {
    setIsBannerDragging(false);
  };

  const handleBannerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try {
          const res = await uploadService.uploadImage(file);
          setBanners(prev => [...prev, res.data.url]);
        } catch (err) {
          console.error('Không thể upload banner:', file.name);
        }
      }
    }
  };

  // Mutations: Settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      alert('Lưu thông tin cửa hàng thành công!');
    }
  });

  // Mutations: Roles
  const createRoleMutation = useMutation({
    mutationFn: (data: any) => settingService.createRole(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(res.data._id);
      setSelectedRole(res.data);
      setIsRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      alert('Tạo vai trò thành công!');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Có lỗi xảy ra')
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: any) => settingService.updateRole(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      alert('Cập nhật vai trò & phân quyền thành công!');
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => settingService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId('');
      setSelectedRole(null);
      alert('Xoá vai trò thành công!');
    }
  });

  // Mutations: Users (Employees)
  const createUserMutation = useMutation({
    mutationFn: (data: any) => settingService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsUserModalOpen(false);
      clearUserForm();
      alert('Thêm nhân viên thành công!');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Có lỗi xảy ra')
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: any) => settingService.updateUser(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsUserModalOpen(false);
      clearUserForm();
      alert('Cập nhật tài khoản nhân viên thành công!');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Có lỗi xảy ra')
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => settingService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('Xoá tài khoản nhân viên thành công!');
    }
  });

  // Handlers
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      storeName,
      logo,
      banners,
      contact: { email, phone, facebook },
      addresses,
      bankInfo: {
        bankName,
        accountHolder,
        accountNumber
      }
    });
  };

  const handlePermissionToggle = (moduleId: string, permId: string) => {
    if (!selectedRole) return;
    const permString = `${moduleId}_${permId}`;
    const newPerms = selectedRole.permissions.includes(permString)
      ? selectedRole.permissions.filter((p: string) => p !== permString)
      : [...selectedRole.permissions, permString];

    setSelectedRole({ ...selectedRole, permissions: newPerms });
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    updateRoleMutation.mutate({
      id: selectedRole._id,
      payload: {
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: selectedRole.permissions
      }
    });
  };

  // User Actions
  const openAddUser = () => {
    setEditingUser(null);
    clearUserForm();
    if (rolesData?.data && rolesData.data.length > 0) {
      setUserRoleId(rolesData.data[0]._id);
    }
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setUserName(user.name || '');
    setUserUsername(user.username || '');
    setUserPhone(user.phone || '');
    setUserEmail(user.email || '');
    setUserPassword(''); // Keep empty to not change unless typed
    setUserRoleId(user.role?._id || user.role || '');
    setUserStatus(user.status || 'active');
    setIsUserModalOpen(true);
  };

  const clearUserForm = () => {
    setUserName('');
    setUserUsername('');
    setUserPhone('');
    setEmail('');
    setUserEmail('');
    setUserPassword('');
    setUserRoleId('');
    setUserStatus('active');
  };

  const handleSaveUser = () => {
    if (!userName.trim() || !userUsername.trim() || !userRoleId) {
      return alert('Vui lòng nhập đầy đủ Tên, Tên đăng nhập và chọn Vai trò');
    }
    const payload: any = {
      name: userName.trim(),
      username: userUsername.trim(),
      phone: userPhone.trim(),
      email: userEmail.trim(),
      role: userRoleId,
      status: userStatus
    };
    if (userPassword.trim() !== '') {
      payload.password = userPassword;
    }

    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser._id, payload });
    } else {
      if (!userPassword.trim()) return alert('Vui lòng nhập mật khẩu cho tài khoản mới');
      createUserMutation.mutate(payload);
    }
  };

  if (isSettingsLoading || isRolesLoading) {
    return <div className="p-6 text-center text-gray-500">Đang tải cấu hình hệ thống...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5 bg-gray-100/50 dark:bg-gray-700/50 p-1.5 rounded-xl border dark:border-gray-700 flex-wrap">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Globe size={16} />
            Thông tin chung cửa hàng
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Shield size={16} />
            Phân quyền tài khoản (Roles)
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Users size={16} />
            Tài khoản nhân viên (Staffs)
          </button>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <SettingsIcon className="text-gray-400 animate-spin-slow" size={20} />
          <span className="text-xs font-semibold text-gray-400">Settings Manager</span>
        </div>
      </div>

      {/* Tab 1: General Info */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/35">
            <h3 className="font-bold text-gray-850 dark:text-white text-base flex items-center gap-2">
              <Globe className="text-primary" size={18} /> Cấu hình thương hiệu & Thông tin liên hệ
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Hiển thị trực tiếp trên trang chủ bán hàng và hóa đơn bán hàng</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Logo & Name */}
              <div className="md:col-span-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Logo cửa hàng</label>
                  <div className="flex items-center gap-4">
                    <div 
                      onDragOver={handleLogoDragOver}
                      onDragLeave={handleLogoDragLeave}
                      onDrop={handleLogoDrop}
                      className={`w-24 h-24 rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 relative group transition-all ${
                        isLogoDragging 
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 scale-105' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                      }`}
                    >
                      {logo ? (
                        <>
                          <img src={`${API_BASE}${logo}`} alt="Logo" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setLogo('')}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-primary transition-colors">
                          <Upload size={22} />
                          <span className="text-[10px] mt-1 font-bold">Tải logo</span>
                          <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        </label>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Khuyến nghị hình vuông.</p>
                      <p>Định dạng PNG/JPG.</p>
                      <p>Kích thước tối đa 2MB.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tên cửa hàng</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    required
                    placeholder="Ví dụ: ANTIGRAVITY SHOP"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Center/Right Column: Contact & Addresses */}
              <div className="md:col-span-2 space-y-4">
                <label className="block text-xs font-bold text-gray-500 uppercase">Thông tin liên hệ</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Số điện thoại hotline</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email hỗ trợ</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="support@store.com"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Trang Fanpage Facebook</label>
                    <input
                      type="text"
                      value={facebook}
                      onChange={e => setFacebook(e.target.value)}
                      placeholder="https://facebook.com/my-shop"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Carousels upload */}
            <div className="border-t dark:border-gray-700 pt-6">
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-500 uppercase">Banner trang chủ (Homepage Banners)</label>
                <p className="text-xs text-gray-400 mt-0.5">Hiển thị dạng Slider trượt ở trang chủ bán hàng. Kéo thả ảnh vào khung dưới để thêm nhanh banner.</p>
              </div>

              {/* Banner Dropzone */}
              <div 
                onDragOver={handleBannerDragOver}
                onDragLeave={handleBannerDragLeave}
                onDrop={handleBannerDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 ${
                  isBannerDragging 
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 scale-[1.01]' 
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                }`}
              >
                <label className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-primary transition-colors gap-2">
                  <Upload size={28} className={isBannerDragging ? 'animate-bounce text-primary' : ''} />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                    Kéo thả nhiều ảnh vào đây hoặc click để chọn file
                  </span>
                  <span className="text-xs text-gray-400">Hỗ trợ định dạng JPEG, PNG, WEBP</span>
                  <input type="file" onChange={handleBannerUpload} className="hidden" accept="image/*" multiple />
                </label>
              </div>

              {banners.length === 0 ? (
                <div className="border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center rounded-xl bg-gray-50/50 dark:bg-gray-800/20 text-gray-400 text-xs">
                  Chưa tải lên banner nào cho trang chủ.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {banners.map((url, idx) => (
                    <div key={idx} className="aspect-[21/9] md:aspect-[16/7] rounded-xl overflow-hidden border dark:border-gray-700 bg-gray-50 dark:bg-gray-700 relative group shadow-sm">
                      <img src={`${API_BASE}${url}`} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeBanner(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Xoá banner"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Store Branches (Chi nhánh cửa hàng) */}
            <div className="border-t dark:border-gray-700 pt-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Danh sách chi nhánh (Store Branches)</label>
                  <p className="text-xs text-gray-400 mt-0.5">Quản lý danh sách các chi nhánh của cửa hàng để khách hàng chọn khi nhận tại quầy.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border-0 outline-none"
                >
                  <Plus size={12} /> Thêm chi nhánh
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center rounded-xl bg-gray-50/50 dark:bg-gray-800/20 text-gray-400 text-xs">
                  Chưa cấu hình chi nhánh nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((branch, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-750/30 p-4 rounded-xl border dark:border-gray-750 space-y-3 relative group text-left transition-all hover:shadow-sm">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div>
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Tên chi nhánh</label>
                            <input
                              type="text"
                              value={branch.branchName || ''}
                              placeholder="Ví dụ: Chi nhánh Quận 1"
                              onChange={e => handleBranchUpdate(idx, 'branchName', e.target.value)}
                              required
                              className="w-full font-bold text-gray-850 dark:text-white bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Địa chỉ</label>
                            <input
                              type="text"
                              value={branch.address || ''}
                              placeholder="Ví dụ: 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM"
                              onChange={e => handleBranchAddressChange(idx, e.target.value)}
                              onFocus={() => {
                                if (branch.address && branch.address.trim().length >= 3) {
                                  fetchSuggestions(idx, branch.address);
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setActiveAddressIdx(null);
                                  setAddressSuggestions([]);
                                }, 250);
                              }}
                              required
                              className="w-full text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                            />
                            {activeAddressIdx === idx && addressSuggestions.length > 0 && (
                              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y dark:divide-gray-750 custom-scrollbar">
                                {addressSuggestions.map((item: any, itemIdx: number) => (
                                  <div
                                    key={itemIdx}
                                    onClick={() => {
                                      handleBranchUpdate(idx, 'address', item.display_name);
                                      if (item.lat) handleBranchUpdate(idx, 'lat', parseFloat(item.lat));
                                      if (item.lon) handleBranchUpdate(idx, 'lon', parseFloat(item.lon));
                                      setActiveAddressIdx(null);
                                      setAddressSuggestions([]);
                                    }}
                                    className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer text-left transition-colors text-[11px] text-gray-700 dark:text-gray-200 leading-normal"
                                  >
                                    {item.display_name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Vĩ độ (Latitude)</label>
                              <input
                                type="number"
                                step="any"
                                value={branch.lat !== undefined ? branch.lat : ''}
                                placeholder="Ví dụ: 10.776"
                                onChange={e => handleBranchUpdate(idx, 'lat', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full text-gray-750 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Kinh độ (Longitude)</label>
                              <input
                                type="number"
                                step="any"
                                value={branch.lon !== undefined ? branch.lon : ''}
                                placeholder="Ví dụ: 106.701"
                                onChange={e => handleBranchUpdate(idx, 'lon', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full text-gray-750 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Giờ mở cửa</label>
                            <input
                              type="text"
                              value={branch.openingHours || ''}
                              placeholder="Ví dụ: 08:00 - 22:00"
                              onChange={e => handleBranchUpdate(idx, 'openingHours', e.target.value)}
                              className="w-full text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBranch(idx)}
                          className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                          title="Xóa chi nhánh"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bank Transfer Configuration */}
            <div className="border-t dark:border-gray-700 pt-6">
              <div className="mb-4 text-left">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Thông tin chuyển khoản ngân hàng (Bank Transfer Details)</label>
                <p className="text-xs text-gray-400 mt-0.5">Cấu hình tài khoản ngân hàng của cửa hàng để khách hàng chuyển khoản khi mua sắm.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-left">
                  <label className="block text-xs text-gray-400 mb-1">Tên ngân hàng (e.g. Vietcombank, MBBank)</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="Ví dụ: Vietcombank"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs"
                  />
                </div>
                <div className="text-left">
                  <label className="block text-xs text-gray-400 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="Ví dụ: 1023456789"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="text-left">
                  <label className="block text-xs text-gray-400 mb-1">Họ tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={e => setAccountHolder(e.target.value)}
                    placeholder="Ví dụ: NGUYEN VAN A"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-700/25 border-t dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="bg-primary hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={16} />
              {updateSettingsMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình cửa hàng'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Permission Matrix & Roles */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left panel: Roles List */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-4 flex flex-col h-max">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs text-gray-500 uppercase">Danh sách Vai trò</h4>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors cursor-pointer"
                title="Tạo vai trò mới"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-1.5">
              {rolesData?.data?.map((role: any) => {
                const isActive = selectedRoleId === role._id;
                return (
                  <div
                    key={role._id}
                    onClick={() => {
                      setSelectedRoleId(role._id);
                      setSelectedRole(role);
                    }}
                    className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-primary/5 text-primary border-primary/20 font-bold'
                        : 'border-transparent text-gray-650 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs">{role.name}</span>
                      {role.description && <span className="text-[10px] text-gray-400 font-normal line-clamp-1">{role.description}</span>}
                    </div>
                    {role.name !== 'Admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Xác nhận xoá vai trò "${role.name}"?`)) {
                            deleteRoleMutation.mutate(role._id);
                          }
                        }}
                        className="p-1 hover:text-red-500 text-gray-400 rounded transition-colors"
                        title="Xoá vai trò"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: CRUD Permission Matrix */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {selectedRole ? (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/35 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-gray-850 dark:text-white text-base flex items-center gap-2">
                      🛡️ Ma trận phân quyền: <span className="text-primary">{selectedRole.name}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedRole.description || 'Chưa có mô tả chi tiết'}</p>
                  </div>
                  <button
                    onClick={handleSavePermissions}
                    disabled={updateRoleMutation.isPending}
                    className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save size={14} />
                    {updateRoleMutation.isPending ? 'Đang lưu...' : 'Lưu bảng quyền'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs border-b dark:border-gray-700">
                        <th className="p-4 font-bold uppercase w-48">Hành động \ Phân hệ</th>
                        {MODULES.map(m => (
                          <th key={m.id} className="p-4 font-bold text-center uppercase">{m.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {PERMISSIONS.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                          <td className="p-4 font-semibold text-xs text-gray-700 dark:text-gray-300">
                            {p.name}
                          </td>
                          {MODULES.map(m => {
                            const permKey = `${m.id}_${p.id}`;
                            const isChecked = selectedRole.permissions?.includes(permKey);
                            const isAdmin = selectedRole.name === 'Admin';
                            return (
                              <td key={m.id} className="p-4 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isAdmin || isChecked}
                                    disabled={isAdmin}
                                    onChange={() => handlePermissionToggle(m.id, p.id)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700 peer transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-gray-50/50 dark:bg-gray-700/10 text-[10px] text-gray-400 border-t dark:border-gray-700">
                  💡 <b>Lưu ý:</b> Vai trò <b>Admin</b> được mặc định bật tất cả các quyền (bao gồm quyền Xuất file) và không thể sửa đổi để tránh khoá tài khoản quản trị.
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 text-sm">
                Vui lòng chọn hoặc thêm vai trò ở danh sách bên trái để cấu hình ma trận phân quyền.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Employee Accounts */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/35 flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-gray-850 dark:text-white text-base flex items-center gap-2">
                <Users className="text-primary" size={18} /> Danh sách Tài khoản nhân viên
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Tạo tài khoản và gán vai trò để phân quyền đăng nhập hệ thống</p>
            </div>
            <button 
              onClick={openAddUser}
              className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={16} /> Thêm nhân viên
            </button>
          </div>

          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs border-b dark:border-gray-700">
                  <th className="p-4 font-bold uppercase">Họ và tên</th>
                  <th className="p-4 font-bold uppercase">Tên đăng nhập</th>
                  <th className="p-4 font-bold uppercase">Số điện thoại</th>
                  <th className="p-4 font-bold uppercase">Vai trò (Role)</th>
                  <th className="p-4 font-bold uppercase">Trạng thái</th>
                  <th className="p-4 font-bold uppercase w-32">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-700/50">
                {isUsersLoading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-400">Đang tải tài khoản...</td></tr>
                ) : usersData?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">Chưa có tài khoản nhân viên nào.</td></tr>
                ) : usersData?.data?.map((u: any) => (
                  <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 text-sm">
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{u.name}</td>
                    <td className="p-4 font-semibold text-primary font-mono">{u.username}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-450 font-mono">{u.phone || '—'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        {u.role?.name || 'Chưa gán'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.status === 'active' 
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' 
                          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                      }`}>
                        {u.status === 'active' ? 'Đang hoạt động' : 'Đang khoá'}
                      </span>
                    </td>
                    <td className="p-4 flex items-center gap-1">
                      <button 
                        onClick={() => openEditUser(u)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Sửa tài khoản"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Xác nhận xoá tài khoản nhân viên "${u.name}"?`)) {
                            deleteUserMutation.mutate(u._id);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Xoá tài khoản"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Role */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6 border border-gray-150 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Tạo Vai trò mới
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tên vai trò (Ví dụ: Manager, Cashier...)</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mô tả vai trò</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Huỷ
              </button>
              <button
                onClick={() => {
                  if (!newRoleName.trim()) return alert('Vui lòng nhập tên vai trò');
                  createRoleMutation.mutate({ name: newRoleName.trim(), description: newRoleDesc.trim() });
                }}
                disabled={createRoleMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {createRoleMutation.isPending ? 'Đang tạo...' : 'Tạo vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Employee User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-150 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white pb-2 border-b dark:border-gray-700">
              {editingUser ? 'Chỉnh sửa tài khoản nhân viên' : 'Thêm tài khoản nhân viên mới'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên nhân viên</label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên đăng nhập (Username)</label>
                  <input
                    type="text"
                    value={userUsername}
                    onChange={e => setUserUsername(e.target.value)}
                    required
                    placeholder="nv_a"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={e => setUserPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Địa chỉ Email (Không bắt buộc)</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="employee@shop.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mật khẩu</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  placeholder={editingUser ? 'Để trống nếu không thay đổi' : 'Nhập mật khẩu tài khoản'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vai trò (Role)</label>
                  <select
                    value={userRoleId}
                    onChange={e => setUserRoleId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm cursor-pointer"
                  >
                    {rolesData?.data?.map((role: any) => (
                      <option key={role._id} value={role._id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trạng thái</label>
                  <select
                    value={userStatus}
                    onChange={e => setUserStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm cursor-pointer"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Khóa tài khoản</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Huỷ
              </button>
              <button
                onClick={handleSaveUser}
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {createUserMutation.isPending || updateUserMutation.isPending ? 'Đang lưu...' : 'Lưu tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
