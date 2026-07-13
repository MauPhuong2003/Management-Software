import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services/customerService';
import { loyaltyService } from '../services/loyaltyService';
import { Plus, Edit2, Trash2, Star, TrendingUp, Gift, ChevronUp, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';

const TIER_FALLBACK_COLORS: Record<string, string> = {
  'Đồng': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  'Bạc': 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
  'Vàng': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  'Kim cương': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
};

const getTierBadgeClass = (tier: string) =>
  TIER_FALLBACK_COLORS[tier] || 'bg-gray-100 text-gray-600 border-gray-200';

const maskPhone = (phone: string) => {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  return '****' + clean.slice(-4);
};

const Customers = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getCustomers({ limit: 100 })
  });
  const { data: loyaltyConfig } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: loyaltyService.getConfig
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState('');
  const { register, handleSubmit, reset } = useForm();

  const exportToExcel = () => {
    if (!data?.data || data.data.length === 0) return alert('Không có dữ liệu để xuất');
    const headers = ['Tên khách hàng', 'Số điện thoại', 'Hạng thành viên', 'Điểm tích lũy', 'Tổng chi tiêu (VND)', 'Địa chỉ', 'Giới tính'];
    const rows = data.data.map((item: any) => [
      item.name,
      item.phone,
      item.tier || 'Đồng',
      item.loyaltyPoints || 0,
      item.totalSpent || 0,
      item.address || '',
      item.gender === 'male' ? 'Nam' : item.gender === 'female' ? 'Nữ' : 'Khác'
    ]);
    const csvContent = "\uFEFF"
      + [headers.join(','), ...rows.map((r: any[]) => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_khach_hang_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (editingCustomer) return customerService.updateCustomer(editingCustomer._id, data);
      return customerService.createCustomer(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      reset();
      setEditingCustomer(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] })
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, points }: { id: string; points: number }) =>
      loyaltyService.adjustPoints(id, points),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomer(data.data);
      setAdjustPoints('');
    }
  });

  const openModal = (customer: any = null) => {
    setEditingCustomer(customer);
    if (customer) reset(customer);
    else reset({ name: '', phone: '', address: '', gender: 'other' });
    setIsModalOpen(true);
  };

  const openDetail = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  const tiers = loyaltyConfig?.data?.tiers || [];
  const getNextTier = (customer: any) => {
    const points = customer.loyaltyPoints || 0;
    const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    return sorted.find(t => t.minPoints > points);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Star className="text-yellow-500" size={22} /> Quản lý Khách hàng
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Điểm tích lũy & Hạng thành viên tự động</p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasPermission('customers', 'export') && (
            <button 
              onClick={exportToExcel}
              className="border border-emerald-500 dark:border-emerald-700 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold cursor-pointer"
            >
              📥 Xuất file Excel
            </button>
          )}
          {hasPermission('customers', 'create') && (
            <button onClick={() => openModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-bold cursor-pointer">
              <Plus size={18} /> Thêm khách hàng
            </button>
          )}
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
              <th className="p-4 font-medium border-b dark:border-gray-700">Tên khách hàng</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Số điện thoại</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Hạng thành viên</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Điểm tích lũy</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Tổng chi tiêu</th>
              <th className="p-4 font-medium border-b dark:border-gray-700 w-36">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={6} className="p-4 text-center text-gray-500">Đang tải...</td></tr>
              : data?.data?.map((item: any) => {
                  const nextTier = getNextTier(item);
                  const points = item.loyaltyPoints || 0;
                  const tierDiscount = tiers.find((t: any) => t.name === item.tier)?.discountPercent || 0;
                  return (
                    <tr key={item._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-4">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-400 font-mono font-medium">{maskPhone(item.phone)}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold w-max ${getTierBadgeClass(item.tier)}`}>
                            {tiers.find((t: any) => t.name === item.tier)?.icon || '🥉'} {item.tier || 'Đồng'}
                          </span>
                          {tierDiscount > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Giảm {tierDiscount}% đơn hàng</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-primary text-sm">{points.toLocaleString()} điểm</span>
                          {nextTier && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-20">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (points / nextTier.minPoints) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 whitespace-nowrap">→ {nextTier.name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">
                        {(item.totalSpent || 0).toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="p-4 flex items-center gap-1.5">
                        <button
                          onClick={() => openDetail(item)}
                          title="Chi tiết điểm"
                          className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <Gift size={16} />
                        </button>
                        {hasPermission('customers', 'update') && (
                          <button
                            onClick={() => openModal(item)}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Sửa khách hàng"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {hasPermission('customers', 'delete') && (
                          <button
                            onClick={() => { if (window.confirm('Xác nhận xoá?')) deleteMutation.mutate(item._id); }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Xoá khách hàng"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Customer Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-lg p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}
            </h3>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tên khách hàng</label>
                <input {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Số điện thoại</label>
                <input {...register('phone')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Địa chỉ</label>
                <input {...register('address')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Giới tính</label>
                <select {...register('gender')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Huỷ</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {mutation.isPending ? 'Đang lưu...' : 'Lưu khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Loyalty Detail Modal */}
      {isDetailOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white"
              >✕</button>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {selectedCustomer.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedCustomer.name}</h3>
                  <p className="text-indigo-200 text-sm font-mono">{maskPhone(selectedCustomer.phone)}</p>
                  <span className="inline-flex items-center gap-1 mt-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {tiers.find((t: any) => t.name === selectedCustomer.tier)?.icon || '🥉'} {selectedCustomer.tier || 'Đồng'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-700">
              <div className="bg-white dark:bg-gray-800 p-4 text-center">
                <p className="text-xs text-gray-400 font-medium">Điểm tích lũy</p>
                <p className="text-2xl font-extrabold text-primary mt-1">
                  {(selectedCustomer.loyaltyPoints || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-400">điểm</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 text-center">
                <p className="text-xs text-gray-400 font-medium">Tổng chi tiêu</p>
                <p className="text-lg font-extrabold text-gray-800 dark:text-white mt-1">
                  {(selectedCustomer.totalSpent || 0).toLocaleString('vi-VN')} ₫
                </p>
                <p className="text-[10px] text-gray-400">đã thanh toán</p>
              </div>
            </div>

            {/* Tier progress */}
            <div className="p-5 space-y-4">
              {tiers.length > 0 && (() => {
                const points = selectedCustomer.loyaltyPoints || 0;
                const nextTier = getNextTier(selectedCustomer);
                const tierDiscount = tiers.find((t: any) => t.name === selectedCustomer.tier)?.discountPercent || 0;
                const tierMultiplier = tiers.find((t: any) => t.name === selectedCustomer.tier)?.pointMultiplier || 1;
                return (
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                        <TrendingUp size={16} className="text-primary" /> Quyền lợi hạng
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 text-center border dark:border-gray-700">
                        <p className="text-gray-400">Hệ số điểm</p>
                        <p className="font-extrabold text-primary text-base mt-0.5">{tierMultiplier}x</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 text-center border dark:border-gray-700">
                        <p className="text-gray-400">Giảm giá</p>
                        <p className="font-extrabold text-emerald-600 text-base mt-0.5">{tierDiscount}%</p>
                      </div>
                    </div>
                    {nextTier && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>Tiến tới <b className="text-gray-700 dark:text-gray-300">{nextTier.icon} {nextTier.name}</b></span>
                          <span>{points.toLocaleString()} / {nextTier.minPoints.toLocaleString()} điểm</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (points / nextTier.minPoints) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Cần thêm <b className="text-primary">{(nextTier.minPoints - points).toLocaleString()}</b> điểm
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Manual adjust */}
              {hasPermission('customers', 'update') && (
                <div className="border-t dark:border-gray-700 pt-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Điều chỉnh điểm thủ công</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={adjustPoints}
                      onChange={e => setAdjustPoints(e.target.value)}
                      placeholder="Nhập điểm (âm để trừ)"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => {
                        const pts = parseInt(adjustPoints);
                        if (isNaN(pts)) return;
                        adjustMutation.mutate({ id: selectedCustomer._id, points: pts });
                      }}
                      disabled={!adjustPoints || adjustMutation.isPending}
                      className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {parseInt(adjustPoints) > 0
                        ? <><ChevronUp size={14} /> Cộng</>
                        : <><ChevronDown size={14} /> Trừ</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
