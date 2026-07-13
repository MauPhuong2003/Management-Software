import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flashSaleService } from '../services/flashSaleService';
import { productService } from '../services/productService';
import { uploadService } from '../services/uploadService';
import { useAuthStore } from '../store/authStore';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Zap, 
  Calendar, 
  Percent, 
  X, 
  Upload, 
  ImageIcon, 
  Search, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Package
} from 'lucide-react';
import { useForm } from 'react-hook-form';

const API_BASE = 'http://localhost:5000';

const FlashSales = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const [page, setPage] = useState(1);

  // Queries
  const { data: flashSalesData, isLoading } = useQuery({
    queryKey: ['flash-sales', page],
    queryFn: () => flashSaleService.getFlashSales({ page, limit: 20 }),
  });

  const { data: productsData, isLoading: isProductsLoading, isError: isProductsError, error: productsError } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productService.getProducts({ limit: 1000 }),
  });
  const allProducts = productsData?.data || [];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm();
  
  // Custom states
  const [banner, setBanner] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Bulk Apply modes
  const [bulkDiscount, setBulkDiscount] = useState<string>('');
  const [bulkQty, setBulkQty] = useState<string>('');

  // Sync edit form
  const openModal = (sale?: any) => {
    if (sale) {
      setEditingSale(sale);
      setBanner(sale.banner || '');
      
      // format datetime-local inputs
      const startIso = sale.startTime ? new Date(sale.startTime).toISOString().slice(0, 16) : '';
      const endIso = sale.endTime ? new Date(sale.endTime).toISOString().slice(0, 16) : '';
      
      reset({
        name: sale.name || '',
        startTime: startIso,
        endTime: endIso,
        status: sale.status || 'active'
      });

      const initialProds = sale.products ? sale.products.map((p: any) => ({
        product: p.product,
        discountPercent: p.discountPercent || 0,
        limitQty: p.limitQty || 0,
        soldQty: p.soldQty || 0,
        active: p.active !== false
      })) : [];
      setSelectedProducts(initialProds);
    } else {
      setEditingSale(null);
      setBanner('');
      reset({
        name: '',
        startTime: '',
        endTime: '',
        status: 'active'
      });
      setSelectedProducts([]);
    }
    setBulkDiscount('');
    setBulkQty('');
    setIsModalOpen(true);
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingSale) {
        return flashSaleService.updateFlashSale(editingSale._id, payload);
      }
      return flashSaleService.createFlashSale(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      setIsModalOpen(false);
      alert('Đã lưu chiến dịch Flash Sale thành công!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: flashSaleService.deleteFlashSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      alert('Đã xóa chiến dịch Flash Sale thành công!');
    }
  });

  // Banner upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const res = await uploadService.uploadImage(e.target.files[0]);
        setBanner(res.data.url);
      } catch (err) {
        alert('Không thể upload banner');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return alert('Chỉ chấp nhận file hình ảnh');
      try {
        const res = await uploadService.uploadImage(file);
        setBanner(res.data.url);
      } catch (err) {
        alert('Không thể upload banner');
      }
    }
  };

  const getProdId = (p: any) => {
    if (!p) return '';
    return typeof p === 'string' ? p : p._id;
  };

  const getProductDetail = (p: any) => {
    const id = getProdId(p);
    const found = allProducts.find((item: any) => item._id === id);
    return found || p;
  };

  // Add product to participation
  const addProductToSale = (prod: any) => {
    const exists = selectedProducts.some(p => getProdId(p.product) === prod._id);
    if (exists) return;
    
    setSelectedProducts(prev => [
      ...prev, 
      {
        product: prod,
        discountPercent: 0,
        limitQty: 0,
        soldQty: 0,
        active: true
      }
    ]);
  };

  const removeProductFromSale = (prodId: string) => {
    setSelectedProducts(prev => prev.filter(p => getProdId(p.product) !== prodId));
  };

  const handleProductChange = (prodId: string, field: 'discountPercent' | 'limitQty', value: number) => {
    setSelectedProducts(prev => prev.map(p => {
      if (getProdId(p.product) === prodId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const toggleProductActive = (prodId: string) => {
    setSelectedProducts(prev => prev.map(p => {
      if (getProdId(p.product) === prodId) {
        return { ...p, active: p.active === false ? true : false };
      }
      return p;
    }));
  };

  // Bulk Apply handler
  const handleBulkApply = () => {
    const disc = parseInt(bulkDiscount) || 0;
    const qty = parseInt(bulkQty) || 0;
    if (disc < 0 || disc > 100) return alert('Phần trăm giảm giá phải từ 0 đến 100');
    if (qty < 0) return alert('Số lượng giới hạn không được âm');
    
    setSelectedProducts(prev => prev.map(p => ({
      ...p,
      discountPercent: bulkDiscount !== '' ? disc : p.discountPercent,
      limitQty: bulkQty !== '' ? qty : p.limitQty
    })));
  };

  const onSubmit = (formData: any) => {
    if (!formData.name) return alert('Vui lòng nhập tên chiến dịch');
    if (!formData.startTime) return alert('Vui lòng chọn thời gian bắt đầu');
    if (!formData.endTime) return alert('Vui lòng chọn thời gian kết thúc');
    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      return alert('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
    }
    if (selectedProducts.length === 0) {
      return alert('Vui lòng thêm ít nhất một sản phẩm tham gia Flash Sale');
    }

    const payload = {
      name: formData.name,
      banner,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      status: formData.status,
      products: selectedProducts.map(p => ({
        product: getProdId(p.product),
        discountPercent: Number(p.discountPercent) || 0,
        limitQty: Number(p.limitQty) || 0,
        soldQty: p.soldQty || 0,
        active: p.active !== false
      }))
    };

    saveMutation.mutate(payload);
  };

  const listData = flashSalesData?.data || [];
  const pagination = flashSalesData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const getStatusBadge = (item: any) => {
    const now = new Date();
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);

    if (item.status === 'inactive') {
      return <span className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 px-2.5 py-1 rounded-full text-xs font-bold">Đã tắt</span>;
    }
    if (now < start) {
      return <span className="bg-blue-50 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-105 dark:border-blue-900/50">Sắp diễn ra</span>;
    }
    if (now >= start && now <= end) {
      return <span className="bg-red-50 dark:bg-red-950/45 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-bold border border-red-105 dark:border-red-900/50 animate-pulse flex items-center gap-1">⚡ Đang chạy</span>;
    }
    return <span className="bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-555 px-2.5 py-1 rounded-full text-xs font-bold">Đã kết thúc</span>;
  };

  const filteredPickerProducts = allProducts.filter((p: any) => {
    const name = p?.name || '';
    const sku = p?.sku || '';
    const searchLower = productSearch.toLowerCase();
    return name.toLowerCase().includes(searchLower) || sku.toLowerCase().includes(searchLower);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Zap className="text-red-500 fill-current" /> Chiến dịch Flash Sale
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tạo chiến dịch bán hàng chớp nhoáng với số lượng giới hạn</p>
        </div>
        {hasPermission('promotions', 'create') && (
          <button onClick={() => openModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm font-bold text-sm cursor-pointer">
            <Plus size={18} /> Tạo chiến dịch
          </button>
        )}
      </div>

      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase border-b dark:border-gray-700">
              <th className="p-4 w-32">Banner</th>
              <th className="p-4">Tên chiến dịch</th>
              <th className="p-4">Thời gian</th>
              <th className="p-4">Số lượng sản phẩm</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4 w-32">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Đang tải danh sách...</td></tr>
            ) : listData.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Chưa có chiến dịch Flash Sale nào được tạo</td></tr>
            ) : listData.map((item: any) => (
              <tr key={item._id} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                <td className="p-4">
                  {item.banner ? (
                    <img src={`${API_BASE}${item.banner}`} alt="Banner" className="w-20 h-10 object-cover rounded-lg border dark:border-gray-700" />
                  ) : (
                    <div className="w-20 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xs font-semibold">Trống</div>
                  )}
                </td>
                <td className="p-4 text-gray-800 dark:text-gray-200 font-semibold">{item.name}</td>
                <td className="p-4 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex flex-col gap-0.5">
                    <span>Bắt đầu: <b>{new Date(item.startTime).toLocaleString('vi-VN')}</b></span>
                    <span>Kết thúc: <b>{new Date(item.endTime).toLocaleString('vi-VN')}</b></span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full text-xs font-bold">
                    {item.products?.length || 0} sản phẩm
                  </span>
                </td>
                <td className="p-4">{getStatusBadge(item)}</td>
                <td className="p-4 flex items-center gap-2">
                  {hasPermission('promotions', 'update') && (
                    <button onClick={() => openModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer" title="Sửa chiến dịch"><Edit2 size={16} /></button>
                  )}
                  {hasPermission('promotions', 'delete') && (
                    <button onClick={() => { if (window.confirm('Xác nhận xoá chiến dịch này?')) deleteMutation.mutate(item._id) }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Xoá chiến dịch"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <span className="text-xs text-gray-500 font-semibold">Trang {page} / {pagination.totalPages} (Tổng {pagination.total} chiến dịch)</span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 border rounded-lg hover:bg-gray-150 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={page === pagination.totalPages} 
              onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
              className="p-1.5 border rounded-lg hover:bg-gray-150 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 50 }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-5xl p-6 border border-gray-100 dark:border-gray-700 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700 mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingSale ? 'Sửa chiến dịch Flash Sale' : 'Tạo chiến dịch Flash Sale'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left side: Campaign Settings */}
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Tên chiến dịch</label>
                    <input {...register('name')} placeholder="Ví dụ: Flash Sale hè rực rỡ" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-750 dark:border-gray-600 dark:text-white text-sm" required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Khung giờ bắt đầu</label>
                    <input type="datetime-local" {...register('startTime')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-750 dark:border-gray-600 dark:text-white text-sm" required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Khung giờ kết thúc</label>
                    <input type="datetime-local" {...register('endTime')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-750 dark:border-gray-600 dark:text-white text-sm" required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Trạng thái kích hoạt</label>
                    <select {...register('status')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-750 dark:border-gray-600 dark:text-white text-sm">
                      <option value="active">Kích hoạt (Cho phép chạy)</option>
                      <option value="inactive">Tạm ẩn (Tắt)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Banner chiến dịch</label>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-full h-32 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-750 relative group transition-all ${
                        isDragging 
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 scale-[1.02]' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                      }`}
                    >
                      {banner ? (
                        <>
                          <img src={`${API_BASE}${banner}`} alt="Banner" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setBanner('')}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-primary transition-colors p-4">
                          <Upload size={24} />
                          <span className="text-xs mt-1.5 font-bold">Kéo thả hoặc tải ảnh</span>
                          <span className="text-[9px] text-gray-400 mt-0.5">PNG, JPG (Tối đa 2MB)</span>
                          <input type="file" onChange={handleBannerUpload} className="hidden" accept="image/*" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Participating Products & Config */}
                <div className="md:col-span-2 space-y-4 border-t md:border-t-0 md:border-l dark:border-gray-700 pt-6 md:pt-0 md:pl-6 flex flex-col">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-extrabold text-gray-800 dark:text-white flex items-center gap-1">
                      <Package size={16} className="text-primary" /> Sản phẩm tham gia ({selectedProducts.length})
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setIsProductPickerOpen(true)}
                      className="bg-indigo-50 dark:bg-indigo-950 text-primary border border-indigo-100 dark:border-indigo-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Thêm sản phẩm
                    </button>
                  </div>

                  {/* Bulk Apply panel */}
                  {selectedProducts.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border dark:border-gray-700 flex flex-wrap gap-4 items-end">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Áp dụng hàng loạt % giảm</label>
                        <div className="flex items-center border rounded-lg bg-white dark:bg-gray-800 px-2.5 py-1 focus-within:ring-1 focus-within:ring-primary">
                          <input type="number" min={0} max={100} placeholder="Ví dụ: 30" value={bulkDiscount} onChange={e => setBulkDiscount(e.target.value)} className="w-16 outline-none bg-transparent text-xs font-bold" />
                          <Percent size={12} className="text-gray-400" />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Áp dụng hàng loạt số lượng bán</label>
                        <input type="number" min={0} placeholder="Ví dụ: 10" value={bulkQty} onChange={e => setBulkQty(e.target.value)} className="w-24 px-2.5 py-1 text-xs font-bold border rounded-lg bg-white dark:bg-gray-850 outline-none focus:ring-1 focus:ring-primary" />
                      </div>

                      <button
                        type="button"
                        onClick={handleBulkApply}
                        className="bg-primary hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        Áp dụng
                      </button>
                    </div>
                  )}

                  {/* Products Grid / Table */}
                  <div className="flex-1 min-h-[300px] overflow-y-auto max-h-[400px] border rounded-xl dark:border-gray-700">
                    {selectedProducts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16">
                        <Package size={36} className="opacity-20 mb-2" />
                        <p className="text-xs">Chưa có sản phẩm nào được chọn.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 font-bold border-b dark:border-gray-700">
                            <th className="p-3 w-12">Ảnh</th>
                            <th className="p-3">Sản phẩm</th>
                            <th className="p-3 w-28">% Giảm giá</th>
                            <th className="p-3 w-28">Số lượng</th>
                            <th className="p-3 w-20 text-center">Bật/Tắt</th>
                            <th className="p-3 w-12 text-center">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                          {selectedProducts.map(p => {
                            const prodDetail = getProductDetail(p.product);
                            const prodId = getProdId(p.product);
                            return (
                              <tr key={prodId} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                                <td className="p-3">
                                  {prodDetail.images && prodDetail.images.length > 0 ? (
                                    <img src={`${API_BASE}${prodDetail.images[0]}`} alt="Product" className="w-8 h-8 object-cover rounded" />
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-150 dark:bg-gray-650 rounded flex items-center justify-center text-gray-400 text-[10px]"><Package size={12}/></div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <p className="font-bold text-gray-800 dark:text-gray-250 truncate w-36 md:w-56">{prodDetail.name || 'Sản phẩm'}</p>
                                  <p className="font-mono text-[9px] text-gray-400">SKU: {prodDetail.sku || 'SKU'} | Giá gốc: {prodDetail.priceSale?.toLocaleString()}đ</p>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center border rounded-lg bg-white dark:bg-gray-800 px-2 py-0.5 focus-within:ring-1 focus-within:ring-primary w-20">
                                    <input 
                                      type="number" 
                                      min={0} 
                                      max={100} 
                                      value={p.discountPercent} 
                                      onChange={e => handleProductChange(prodId, 'discountPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                      className="w-12 outline-none bg-transparent font-bold text-xs" 
                                    />
                                    <Percent size={10} className="text-gray-400" />
                                  </div>
                                </td>
                                <td className="p-3">
                                  <input 
                                    type="number" 
                                    min={0} 
                                    value={p.limitQty} 
                                    onChange={e => handleProductChange(prodId, 'limitQty', Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-20 px-2 py-0.5 border rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-primary font-bold text-xs" 
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleProductActive(prodId)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
                                      p.active !== false 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 hover:bg-emerald-100' 
                                        : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    {p.active !== false ? 'Đang bật' : 'Đang tắt'}
                                  </button>
                                </td>
                                <td className="p-3 text-center">
                                  <button type="button" onClick={() => removeProductFromSale(prodId)} className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"><Trash2 size={14} /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:border-gray-600 text-sm font-bold dark:text-white cursor-pointer">Hủy</button>
                <button type="submit" disabled={saveMutation.isPending} className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-indigo-700 text-sm font-bold shadow-md shadow-primary/20 transition-all cursor-pointer">
                  {saveMutation.isPending ? 'Đang lưu...' : 'Lưu chiến dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Product Picker Modal */}
      {isProductPickerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4" style={{ zIndex: 60 }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-5 border dark:border-gray-700 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700 mb-4 shrink-0">
              <h4 className="text-base font-bold text-gray-905 dark:text-white">Thêm sản phẩm tham gia</h4>
              <button onClick={() => setIsProductPickerOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"><X size={18} /></button>
            </div>

            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm sản phẩm theo tên, SKU..." 
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-semibold"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isProductsLoading ? (
                <p className="text-xs text-center text-gray-500 py-8 animate-pulse">Đang tải danh sách sản phẩm...</p>
              ) : isProductsError ? (
                <p className="text-xs text-center text-red-500 py-8 font-bold">Lỗi tải sản phẩm: {(productsError as any)?.response?.data?.message || (productsError as any)?.message}</p>
              ) : filteredPickerProducts.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-8">Không tìm thấy sản phẩm nào</p>
              ) : filteredPickerProducts.map((p: any) => {
                const isSelected = selectedProducts.some(sp => getProdId(sp.product) === p._id);
                return (
                  <div key={p._id} className="flex justify-between items-center p-2.5 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex gap-2.5 items-center">
                      {p.images && p.images.length > 0 ? (
                        <img src={`${API_BASE}${p.images[0]}`} alt="Product" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-150 dark:bg-gray-650 rounded flex items-center justify-center text-gray-400 text-xs"><Package size={14}/></div>
                      )}
                      <div className="text-left text-xs">
                        <p className="font-bold text-gray-800 dark:text-white line-clamp-1">{p.name}</p>
                        <p className="font-mono text-[9px] text-gray-400 mt-0.5">SKU: {p.sku} | Giá: {p.priceSale?.toLocaleString()}đ</p>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="text-emerald-500 font-bold flex items-center gap-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full"><Check size={12}/> Đã thêm</span>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => addProductToSale(p)}
                        className="bg-primary hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Chọn
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t dark:border-gray-700 flex justify-end shrink-0 mt-4">
              <button onClick={() => setIsProductPickerOpen(false)} className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Xong</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashSales;
