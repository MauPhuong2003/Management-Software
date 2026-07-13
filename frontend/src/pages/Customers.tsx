import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services/customerService';
import { loyaltyService } from '../services/loyaltyService';
import { orderService } from '../services/orderService';
import { 
  Plus, Edit2, Trash2, Star, Gift, ChevronUp, ChevronDown, 
  MessageSquare, Phone, Mail, Calendar, MapPin, Eye, ArrowLeft,
  FileText
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const { register, handleSubmit, reset } = useForm();

  const { data: pointHistoryRes } = useQuery({
    queryKey: ['point-history', selectedCustomer?._id],
    queryFn: () => loyaltyService.getPointHistory(selectedCustomer._id),
    enabled: !!selectedCustomer?._id
  });
  const pointHistory = pointHistoryRes?.data || [];

  const { data: customerOrdersRes } = useQuery({
    queryKey: ['customer-orders', selectedCustomer?._id],
    queryFn: () => orderService.getOrders({ customer: selectedCustomer._id, limit: 100 }),
    enabled: !!selectedCustomer?._id && isDetailOpen
  });
  const customerOrders = customerOrdersRes?.data || [];

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
      queryClient.invalidateQueries({ queryKey: ['point-history', selectedCustomer?._id] });
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

  if (isDetailOpen && selectedCustomer) {
    const totalOrders = customerOrders.length;
    const averageOrderValue = totalOrders > 0
      ? Math.round(customerOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0) / totalOrders)
      : 0;

    const purchasedProducts = (() => {
      const productsMap = new Map<string, any>();
      customerOrders.forEach((o: any) => {
        o.items?.forEach((item: any) => {
          if (item.product && !productsMap.has(item.product._id)) {
            productsMap.set(item.product._id, item.product);
          }
        });
      });
      return Array.from(productsMap.values()).slice(0, 8);
    })();

    const tierIcon = tiers.find((t: any) => t.name === selectedCustomer.tier)?.icon || '🥉';

    return (
      <div className="space-y-6">
         {/* Breadcrumbs */}
         <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
           <button onClick={() => setIsDetailOpen(false)} className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-0 outline-none">
             <ArrowLeft size={16} /> Khách hàng
           </button>
           <span>/</span>
           <button onClick={() => setIsDetailOpen(false)} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 outline-none">Tất cả khách hàng</button>
           <span>/</span>
           <span className="text-gray-800 dark:text-white font-bold">Chi tiết khách hàng</span>
         </div>

         {/* Two-Column Layout */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
           
           {/* Left Column: Customer Profile & Loyalty Summary */}
           <div className="space-y-6 lg:col-span-1">
             {/* Profile Card */}
             <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
               <div className="relative w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 overflow-hidden shadow-inner">
                 {selectedCustomer.avatar ? (
                   <img src={selectedCustomer.avatar.startsWith('http') ? selectedCustomer.avatar : `http://localhost:5000${selectedCustomer.avatar}`} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-3xl font-bold text-primary">{selectedCustomer.name?.charAt(0).toUpperCase()}</span>
                 )}
               </div>
               <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4 flex items-center justify-center gap-1.5">
                 {selectedCustomer.name}
                 {hasPermission('customers', 'update') && (
                   <button onClick={() => openModal(selectedCustomer)} className="text-gray-400 hover:text-primary transition-colors cursor-pointer bg-transparent border-0 outline-none">
                     <Edit2 size={14} />
                   </button>
                 )}
               </h3>
               <p className="text-xs text-gray-400 font-semibold mt-1 flex items-center gap-1 bg-gray-100 dark:bg-gray-750/30 px-2.5 py-0.5 rounded-full border dark:border-gray-700">
                 {tierIcon} Thành viên {selectedCustomer.tier}
               </p>

               <div className="w-full border-t dark:border-gray-700 my-6"></div>

               {/* Contact details list */}
               <div className="w-full space-y-4 text-xs font-bold text-gray-650 dark:text-gray-300 text-left">
                 <div className="flex items-center gap-2">
                   <Phone size={14} className="text-gray-400 shrink-0" />
                   <span className="font-mono">{selectedCustomer.phone}</span>
                   <button className="text-primary hover:text-indigo-700 ml-auto cursor-pointer bg-transparent border-0 outline-none">
                     <MessageSquare size={14} />
                   </button>
                 </div>
                 <div className="flex items-center gap-2">
                   <Mail size={14} className="text-gray-400 shrink-0" />
                   <span className="truncate">{selectedCustomer.email || '-'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Calendar size={14} className="text-gray-400 shrink-0" />
                   <span>Ngày sinh: {selectedCustomer.birthday ? new Date(selectedCustomer.birthday).toLocaleDateString('vi-VN') : 'Người dùng chưa cập nhật'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Calendar size={14} className="text-gray-400 shrink-0" />
                   <span>Ngày vào app: {new Date(selectedCustomer.createdAt).toLocaleDateString('vi-VN')}</span>
                 </div>
                 <div className="flex items-start gap-2">
                   <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                   <span className="leading-relaxed">{selectedCustomer.address || '-'}</span>
                 </div>
               </div>
             </div>

             {/* Loyalty Status Card */}
             <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4 text-left">
               <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-wider">Trạng thái khách hàng</h4>
               <div className="space-y-3.5 text-xs">
                 <div className="flex justify-between">
                   <span className="text-gray-400 font-semibold">Giá trị đơn hàng trung bình</span>
                   <span className="font-extrabold text-gray-800 dark:text-white">{averageOrderValue.toLocaleString()}đ</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400 font-semibold">Đã đặt</span>
                   <span className="font-extrabold text-gray-800 dark:text-white">{totalOrders} đơn hàng</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400 font-semibold">Số tiền đã chi</span>
                   <span className="font-extrabold text-gray-800 dark:text-white">{(selectedCustomer.totalSpent || 0).toLocaleString()}đ</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-gray-400 font-semibold">Điểm tích lũy</span>
                   <div className="flex items-center gap-1.5">
                     <span className="font-extrabold text-primary text-sm">{(selectedCustomer.loyaltyPoints || 0).toLocaleString()} điểm</span>
                     <button onClick={() => setIsHistoryModalOpen(true)} className="text-xs text-primary hover:underline font-extrabold cursor-pointer bg-transparent border-0 outline-none">
                       Chi tiết
                     </button>
                   </div>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-gray-400 font-semibold">Cài đặt điểm</span>
                   <button onClick={() => setIsAdjustModalOpen(true)} className="text-xs text-primary hover:underline font-extrabold cursor-pointer bg-transparent border-0 outline-none">
                     Cài đặt
                   </button>
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
                   <span className="text-gray-400 font-semibold">Cập nhật khách sỉ</span>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" />
                     <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                   </label>
                 </div>
               </div>
             </div>
           </div>

           {/* Right Column: Order History & Purchased Products */}
           <div className="space-y-6 lg:col-span-2 text-left">
             {/* Orders Card */}
             <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="text-sm font-extrabold text-gray-800 dark:text-white uppercase tracking-wider">Đơn hàng ({totalOrders})</h3>
               </div>
               <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto pr-1 space-y-4">
                 {customerOrders.length === 0 ? (
                   <p className="text-xs text-gray-400 text-center py-10">Khách hàng chưa có đơn hàng nào</p>
                 ) : (
                   customerOrders.map((order: any) => {
                     const statusColors: Record<string, string> = {
                       pending: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
                       confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400',
                       shipping: 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
                       delivered: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400',
                       cancelled: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400',
                     };
                     const statusTexts: Record<string, string> = {
                       pending: 'Chờ xác nhận',
                       confirmed: 'Đã xác nhận',
                       shipping: 'Đang giao hàng',
                       delivered: 'Đã giao hàng',
                       cancelled: 'Đã hủy',
                     };
                     return (
                       <div key={order._id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0 gap-4">
                         <div className="space-y-1">
                           <div className="flex items-center gap-2">
                             <span className="font-extrabold text-xs text-gray-850 dark:text-white">Mã đơn: {order.orderCode}</span>
                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusColors[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                               {statusTexts[order.orderStatus] || order.orderStatus}
                             </span>
                           </div>
                           <p className="text-xs text-gray-500 font-semibold">Giá trị: {order.totalAmount?.toLocaleString()}đ</p>
                           <p className="text-[10px] text-gray-400 font-semibold">Ngày đặt: {new Date(order.createdAt).toLocaleTimeString('vi-VN')} {new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                           {order.promotionCode && (
                             <span className="inline-flex text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black mt-1">
                               {order.promotionCode}
                             </span>
                           )}
                         </div>
                          <button 
                            onClick={() => setViewingOrder(order)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors ml-auto bg-transparent border-0 outline-none"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye size={16} />
                          </button>
                       </div>
                     );
                   })
                 )}
               </div>
             </div>

             {/* Purchased Products Card */}
             <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
               <h3 className="text-sm font-extrabold text-gray-800 dark:text-white uppercase tracking-wider">Sản phẩm đã mua</h3>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 {purchasedProducts.length === 0 ? (
                   <div className="col-span-full py-10 text-center text-xs text-gray-400">Chưa có sản phẩm đã mua</div>
                 ) : (
                   purchasedProducts.map((prod: any) => (
                     <div key={prod._id} className="border dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/30 flex flex-col">
                       <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                         {prod.images && prod.images.length > 0 ? (
                           <img src={prod.images[0].startsWith('http') ? prod.images[0] : `http://localhost:5000${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover" />
                         ) : (
                           <span className="text-gray-300 dark:text-gray-600 text-xs">Không có ảnh</span>
                         )}
                       </div>
                       <div className="p-2.5 flex-1 flex flex-col justify-between gap-1 text-left">
                         <h5 className="text-[11px] font-extrabold text-gray-850 dark:text-white line-clamp-2 leading-tight">{prod.name}</h5>
                         <p className="text-[10px] font-black text-primary mt-1">{prod.price?.toLocaleString()}đ</p>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
           </div>

         </div>

         {/* Sub-modals for Point History and Adjust Points */}
         {isHistoryModalOpen && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-150 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
               <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                 <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Lịch sử tích/tiêu điểm</h4>
                 <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-450 hover:text-gray-800 dark:hover:text-white font-extrabold cursor-pointer bg-transparent border-0 outline-none">✕</button>
               </div>
               <div className="p-5 max-h-[400px] overflow-y-auto space-y-2.5 custom-scrollbar">
                 {pointHistory.length === 0 ? (
                   <p className="text-xs text-gray-400 text-center py-10">Chưa có lịch sử điểm</p>
                 ) : (
                   pointHistory.map((log: any) => {
                     const isEarn = log.points >= 0;
                     return (
                       <div key={log._id} className="flex justify-between items-start gap-2.5 p-3 bg-gray-50 dark:bg-gray-750/30 rounded-xl border dark:border-gray-750 text-xs">
                         <div className="flex-1 min-w-0 text-left">
                           <p className="font-semibold text-gray-750 dark:text-gray-200">{log.reason}</p>
                           <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                             {new Date(log.createdAt).toLocaleString('vi-VN')}
                           </p>
                         </div>
                         <span className={`font-extrabold shrink-0 ${isEarn ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                           {isEarn ? `+${log.points}` : log.points}
                         </span>
                       </div>
                     );
                   })
                 )}
               </div>
             </div>
           </div>
         )}

         {isAdjustModalOpen && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-150 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
               <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                 <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Cài đặt điểm tích luỹ</h4>
                 <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-450 hover:text-gray-800 dark:hover:text-white font-extrabold cursor-pointer bg-transparent border-0 outline-none">✕</button>
               </div>
               <div className="p-5 space-y-4">
                 <p className="text-xs text-gray-500 font-semibold text-left">Điều chỉnh điểm thủ công cho khách hàng <b>{selectedCustomer.name}</b></p>
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
                       setIsAdjustModalOpen(false);
                     }}
                     disabled={!adjustPoints || adjustMutation.isPending}
                     className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                   >
                     {parseInt(adjustPoints) > 0
                       ? <><ChevronUp size={14} /> Cộng</>
                       : <><ChevronDown size={14} /> Trừ</>}
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Edit Customer Modal inside Detail Page */}
         {isModalOpen && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-150 dark:border-gray-700 p-6 animate-in fade-in zoom-in-95 duration-150">
               <h3 className="text-sm font-black uppercase text-gray-800 dark:text-white tracking-wider mb-4">
                 {editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}
               </h3>
               <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 text-left">
                 <div>
                   <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tên khách hàng</label>
                   <input type="text" {...register('name', { required: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1 dark:text-gray-300">Số điện thoại</label>
                   <input type="text" {...register('phone', { required: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                   <input type="email" {...register('email')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1 dark:text-gray-300">Địa chỉ</label>
                   <input type="text" {...register('address')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
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

         {/* Order Detail Modal */}
         {viewingOrder && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4 text-left">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl p-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
               {/* Header */}
               <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700 mb-6">
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   📄 Chi tiết đơn hàng: <span className="text-primary font-extrabold">{viewingOrder.orderCode}</span>
                 </h3>
                 <button 
                   type="button" 
                   onClick={() => setViewingOrder(null)}
                   className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors bg-transparent border-0 outline-none cursor-pointer"
                 >
                   ✕
                 </button>
               </div>

               {/* Grid details */}
               <div className="grid grid-cols-2 gap-6 mb-6">
                 {/* Order Info */}
                 <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl space-y-2.5 text-sm dark:bg-gray-700/30 border dark:border-gray-700/50">
                   <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-1.5">Thông tin đơn hàng</h4>
                   <div className="flex justify-between">
                     <span className="text-gray-500">Ngày tạo:</span>
                     <span className="font-semibold text-gray-850 dark:text-gray-200">{new Date(viewingOrder.createdAt).toLocaleString('vi-VN')}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-550">Trạng thái:</span>
                     <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-750 dark:bg-gray-700 dark:text-gray-350`}>
                       {viewingOrder.orderStatus === 'pending' ? 'Chờ xác nhận' :
                        viewingOrder.orderStatus === 'confirmed' ? 'Đã xác nhận' :
                        viewingOrder.orderStatus === 'shipping' ? 'Đang giao hàng' :
                        viewingOrder.orderStatus === 'delivered' ? 'Đã hoàn thành' :
                        viewingOrder.orderStatus === 'cancelled' ? 'Đã huỷ' : viewingOrder.orderStatus}
                     </span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-500">Thanh toán:</span>
                     <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${viewingOrder.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-750 dark:bg-yellow-900/20'}`}>
                       {viewingOrder.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-505">Hình thức:</span>
                     <span className="font-semibold text-gray-850 dark:text-gray-200">
                       {viewingOrder.paymentMethod === 'cash' ? '💵 Tiền mặt' : 
                        viewingOrder.paymentMethod === 'transfer' ? '💳 Chuyển khoản' : 
                        viewingOrder.paymentMethod || 'Tiền mặt'}
                     </span>
                   </div>
                   {viewingOrder.note && (
                     <div className="pt-1.5 border-t dark:border-gray-700 text-xs text-gray-500">
                       <b>Ghi chú:</b> {viewingOrder.note}
                     </div>
                   )}
                 </div>

                 {/* Customer Info */}
                 <div className="bg-gray-50 dark:bg-gray-755 p-4 rounded-xl space-y-2.5 text-sm dark:bg-gray-700/30 border dark:border-gray-700/50">
                   <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-1.5">Thông tin khách hàng</h4>
                   <div className="flex justify-between">
                     <span className="text-gray-500">Tên:</span>
                     <span className="font-semibold text-gray-850 dark:text-gray-200">{selectedCustomer.name}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-550">SĐT:</span>
                     <span className="font-semibold text-gray-850 dark:text-gray-200 font-mono">{selectedCustomer.phone}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-555">Địa chỉ:</span>
                     <span className="font-semibold text-gray-850 dark:text-gray-200 text-right max-w-[180px] truncate" title={selectedCustomer.address || 'Chưa cập nhật'}>
                       {selectedCustomer.address || 'Chưa cập nhật'}
                     </span>
                   </div>
                 </div>
               </div>

               {/* Products List */}
               <div className="border dark:border-gray-700 rounded-xl overflow-hidden mb-6">
                 <table className="w-full text-left text-xs border-collapse">
                   <thead>
                     <tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold border-b dark:border-gray-700">
                       <th className="p-3 w-12">Ảnh</th>
                       <th className="p-3">Sản phẩm</th>
                       <th className="p-3">Đơn giá</th>
                       <th className="p-3 w-16 text-center">SL</th>
                       <th className="p-3 text-right">Thành tiền</th>
                     </tr>
                   </thead>
                   <tbody>
                     {viewingOrder.items?.map((item: any, idx: number) => {
                       const img = item.product?.images?.[0];
                       const imgSrc = img ? (img.startsWith('http') ? img : `${API_BASE}${img}`) : '';
                       return (
                         <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                           <td className="p-3">
                             <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg shrink-0 overflow-hidden border dark:border-gray-700 flex items-center justify-center">
                               {imgSrc ? (
                                 <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 <FileText size={16} className="text-gray-400" />
                               )}
                             </div>
                           </td>
                           <td className="p-3 font-semibold text-gray-855 dark:text-gray-200 align-middle">
                             {item.product?.name || 'Sản phẩm đã bị xóa'}
                           </td>
                           <td className="p-3 text-gray-700 dark:text-gray-300 align-middle">{item.price?.toLocaleString()}đ</td>
                           <td className="p-3 text-center font-medium text-gray-855 dark:text-gray-200 align-middle">{item.qty}</td>
                           <td className="p-3 text-right font-bold text-gray-900 dark:text-white align-middle">{(item.price * item.qty).toLocaleString()}đ</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>

                {/* Total Footer */}
                {(() => {
                  const subtotal = viewingOrder.items?.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0) || 0;
                  const tierDiscountPercent = tiers.find((t: any) => t.name === selectedCustomer.tier)?.discountPercent || 0;
                  const totalRegularDiscount = viewingOrder.discountAmount || 0;
                  const memberTierDiscount = Math.min(totalRegularDiscount, Math.round(subtotal * (tierDiscountPercent / 100)));
                  const voucherDiscount = Math.max(0, totalRegularDiscount - memberTierDiscount);

                  return (
                    <div className="flex justify-between items-start pt-4 border-t dark:border-gray-700">
                      <button 
                        type="button" 
                        onClick={() => setViewingOrder(null)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-655 transition-colors font-medium text-sm border-0 cursor-pointer"
                      >
                        Đóng
                      </button>
                      <div className="text-right space-y-2 w-80 text-xs">
                        <div className="flex justify-between text-gray-500 font-medium">
                          <span>Số tiền ban đầu:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{subtotal.toLocaleString()}đ</span>
                        </div>

                        {memberTierDiscount > 0 && (
                          <div className="flex justify-between text-gray-500 font-medium">
                            <span>Ưu đãi hạng ({selectedCustomer.tier} -{tierDiscountPercent}%):</span>
                            <span className="text-amber-600 dark:text-amber-405 font-semibold">-{memberTierDiscount.toLocaleString()}đ</span>
                          </div>
                        )}

                        {voucherDiscount > 0 && (
                          <div className="flex justify-between text-gray-550 font-medium">
                            <span>Voucher áp dụng {viewingOrder.promotionCode ? `(${viewingOrder.promotionCode})` : ''}:</span>
                            <span className="text-emerald-600 dark:text-emerald-405 font-semibold">-{voucherDiscount.toLocaleString()}đ</span>
                          </div>
                        )}

                        {viewingOrder.loyaltyDiscount > 0 && (
                          <div className="flex justify-between text-gray-550 font-medium">
                            <span>Dùng điểm tích luỹ ({viewingOrder.loyaltyPointsUsed || 0} điểm):</span>
                            <span className="text-indigo-655 dark:text-indigo-405 font-semibold">-{viewingOrder.loyaltyDiscount.toLocaleString()}đ</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700 text-sm">
                          <span className="text-gray-800 dark:text-white font-extrabold">Tổng thanh toán:</span>
                          <span className="text-xl font-extrabold text-primary">{viewingOrder.totalAmount?.toLocaleString()}đ</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
      </div>
    );
  }

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
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-650 transition-colors">Huỷ</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {mutation.isPending ? 'Đang lưu...' : 'Lưu khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
