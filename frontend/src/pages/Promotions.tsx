import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionService } from '../services/promotionService';
import { productService } from '../services/productService';
import { uploadService } from '../services/uploadService';
import { Plus, Edit2, Trash2, Tag, Infinity as InfinityIcon, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';

const API_BASE = 'http://localhost:5000';

const Promotions = () => {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['promotions'], queryFn: () => promotionService.getPromotions() });

  const { data: productsData } = useQuery({ 
    queryKey: ['products-all'], 
    queryFn: () => productService.getProducts({ limit: 1000 }) 
  });
  const allProducts = productsData?.data || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [promoImage, setPromoImage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const res = await uploadService.uploadImage(file);
      if (res.success && res.data) {
        setPromoImage(res.data.url);
      }
    } catch (err) {
      alert('Không thể tải hình ảnh lên. Vui lòng thử lại!');
    }
  };

  const { register, handleSubmit, reset, watch } = useForm();
  const applyType = watch('applyType') || 'order';

  const mutation = useMutation({
    mutationFn: (formData: any) => {
      const payload = {
        ...formData,
        image: promoImage,
        value: Number(formData.value) || 0,
        minOrderValue: Number(formData.minOrderValue) || 0,
        buyQty: Number(formData.buyQty) || 1,
        discountYValue: Number(formData.discountYValue) || 0,
        isRecursive: !!formData.isRecursive,
        usageLimit: formData.usageLimit !== '' && formData.usageLimit !== null && formData.usageLimit !== undefined ? Number(formData.usageLimit) : null,
        limitPerUser: formData.limitPerUser !== '' && formData.limitPerUser !== null && formData.limitPerUser !== undefined ? Number(formData.limitPerUser) : null,
        applyProductIds: selectedProducts,
        buyProductId: formData.buyProductId || null,
        getProductId: formData.getProductId || null,
        isVisible: formData.isVisible === 'false' ? false : true
      };
      if (editingPromo) return promotionService.updatePromotion(editingPromo._id, payload);
      return promotionService.createPromotion(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setIsModalOpen(false);
      reset();
      setEditingPromo(null);
      setSelectedProducts([]);
      setPromoImage('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: promotionService.deletePromotion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] })
  });

  const openModal = (promo: any = null) => {
    setEditingPromo(promo);
    if (promo) {
      reset({ 
        code: promo.code || '',
        name: promo.name || '',
        description: promo.description || '',
        type: promo.type || 'percent',
        value: promo.value || 0,
        minOrderValue: promo.minOrderValue || 0,
        status: promo.status || 'active',
        startDate: promo.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : '', 
        endDate: promo.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : '',
        applyType: promo.applyType || 'order',
        buyQty: promo.buyQty || 1,
        buyProductId: promo.buyProductId?._id || promo.buyProductId || '',
        getProductId: promo.getProductId?._id || promo.getProductId || '',
        discountYValue: promo.discountYValue || 0,
        usageLimit: promo.usageLimit !== null && promo.usageLimit !== undefined ? promo.usageLimit : '',
        limitPerUser: promo.limitPerUser !== null && promo.limitPerUser !== undefined ? promo.limitPerUser : '',
        isVisible: promo.isVisible !== false ? 'true' : 'false'
      });
      setPromoImage(promo.image || '');
      setSelectedProducts(promo.applyProductIds ? promo.applyProductIds.map((p: any) => p._id || p) : []);
    } else {
      reset({ 
        code: '', 
        name: '',
        description: '',
        type: 'percent', 
        value: 0, 
        minOrderValue: 0, 
        status: 'active', 
        startDate: '', 
        endDate: '',
        applyType: 'order',
        buyQty: 1,
        buyProductId: '',
        getProductId: '',
        discountYValue: 0,
        usageLimit: '',
        limitPerUser: '',
        isVisible: 'true'
      });
      setPromoImage('');
      setSelectedProducts([]);
    }
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Tag className="text-primary"/> Quản lý Khuyến mãi</h2>
        {hasPermission('promotions', 'create') && (
          <button onClick={() => openModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
            <Plus size={18} /> Tạo mã giảm giá
          </button>
        )}
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b dark:border-gray-700">
              <th className="p-4 font-medium">Mã Code</th>
              <th className="p-4 font-medium">Loại & Giá trị</th>
              <th className="p-4 font-medium">Giới hạn sử dụng</th>
              <th className="p-4 font-medium">Đơn tối thiểu</th>
              <th className="p-4 font-medium">Thời gian</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium w-32">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="p-4 text-center text-gray-500">Đang tải...</td></tr> : data?.data?.length === 0 ? <tr><td colSpan={7} className="p-4 text-center text-gray-500">Không có khuyến mãi nào</td></tr> : data?.data?.map((item: any) => (
              <tr key={item._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img src={item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`} alt={item.name} className="w-10 h-10 object-cover rounded-lg border dark:border-gray-700 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 shrink-0"><Tag size={16}/></div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-primary font-bold">{item.code}</span>
                      <span className="text-xs font-semibold text-gray-850 dark:text-gray-205 line-clamp-1">{item.name || 'Chưa đặt tên'}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-gray-800 dark:text-gray-200">
                  <div className="flex flex-col gap-1 text-sm">
                    <div>
                      {item.applyType === 'product' && (
                        <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-semibold border border-blue-100 dark:border-blue-900">
                          Sản phẩm
                        </span>
                      )}
                      {item.applyType === 'order' && (
                        <span className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-semibold border border-green-100 dark:border-green-900">
                          Đơn hàng
                        </span>
                      )}
                      {item.applyType === 'shipping' && (
                        <span className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded text-xs font-semibold border border-amber-100 dark:border-amber-900">
                          Vận chuyển
                        </span>
                      )}
                      {item.applyType === 'buy_x_get_y' && (
                        <span className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-semibold border border-purple-100 dark:border-purple-900">
                          Mua X giảm % Y
                        </span>
                      )}
                    </div>
                    {item.applyType === 'buy_x_get_y' ? (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Mua {item.buyQty} <b>{item.buyProductId?.name || 'Sản phẩm X'}</b> giảm <b>{item.discountYValue}%</b> cho <b>{item.getProductId?.name || 'Sản phẩm Y'}</b>
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.type === 'percent' ? `Giảm ${item.value || 0}%` : `Giảm ${(item.value || 0).toLocaleString()}đ`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="flex items-center gap-1">Đã dùng: <b className="font-semibold text-gray-900 dark:text-white flex items-center">{item.usedCount || 0} / {item.usageLimit !== null && item.usageLimit !== undefined ? `${item.usageLimit} lượt` : <InfinityIcon size={14} className="text-gray-400 dark:text-gray-500" />}</b></span>
                    <span className="flex items-center gap-1">Lượt dùng / Khách: <b className="font-semibold text-gray-900 dark:text-white flex items-center">{item.limitPerUser !== null && item.limitPerUser !== undefined ? `${item.limitPerUser} lần` : <InfinityIcon size={14} className="text-gray-400 dark:text-gray-500" />}</b></span>
                  </div>
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-400">{(item.minOrderValue || 0).toLocaleString()}đ</td>
                <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                  {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : 'N/A'} - {item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : 'N/A'}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {item.status === 'active' ? 'Đang bật' : 'Đã tắt'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.isVisible !== false ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                      {item.isVisible !== false ? 'Hiển thị Shop' : 'Ẩn (MiniGame)'}
                    </span>
                  </div>
                </td>
                <td className="p-4 flex items-center gap-2">
                  {hasPermission('promotions', 'update') && (
                    <button onClick={() => openModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer" title="Sửa khuyến mãi"><Edit2 size={16} /></button>
                  )}
                  {hasPermission('promotions', 'delete') && (
                    <button onClick={() => { if(window.confirm('Xác nhận xoá?')) deleteMutation.mutate(item._id) }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Xoá khuyến mãi"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl p-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white pb-2 border-b dark:border-gray-700">{editingPromo ? 'Sửa Khuyến mãi' : 'Thêm Khuyến mãi'}</h3>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tên Khuyến mãi *</label>
                  <input {...register('name')} placeholder="Ví dụ: Ưu đãi hè rực rỡ" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Mô tả chi tiết</label>
                  <textarea {...register('description')} rows={2} placeholder="Nhập mô tả thể lệ chương trình hoặc điều kiện áp dụng..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"></textarea>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 dark:text-gray-300">Hình ảnh đại diện (Tỉ lệ 1:1)</label>
                  <div className="flex items-center gap-4">
                    {promoImage ? (
                      <div className="relative w-20 h-20 border rounded-xl overflow-hidden dark:border-gray-700 bg-gray-50 flex items-center justify-center shrink-0">
                        <img src={promoImage.startsWith('http') ? promoImage : `${API_BASE}${promoImage}`} alt="Promo preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPromoImage('')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 cursor-pointer"><X size={10} /></button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 border-2 border-dashed border-gray-350 dark:border-gray-650 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors text-gray-500 dark:text-gray-400 shrink-0"
                      >
                        <Upload size={18} />
                        <span className="text-[10px] mt-1">Tải ảnh lên</span>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 font-medium">Khuyên dùng ảnh hình vuông (1:1) để hiển thị tối ưu trên vé giảm giá.</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Loại hình Voucher</label>
                  <select {...register('applyType')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                    <option value="order">Voucher cho Đơn hàng</option>
                    <option value="product">Voucher cho Sản phẩm</option>
                    <option value="shipping">Voucher cho Vận chuyển</option>
                    <option value="buy_x_get_y">Voucher Mua X giảm % Y</option>
                  </select>
                </div>
              </div>

              {/* Conditional Field: Product Selector */}
              {applyType === 'product' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium dark:text-gray-300">Chọn sản phẩm áp dụng</label>
                  <div className="border dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 space-y-1">
                    {allProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 p-2">Không có sản phẩm nào</p>
                    ) : (
                      allProducts.map((prod: any) => {
                        const isChecked = selectedProducts.includes(prod._id);
                        return (
                          <label key={prod._id} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer select-none text-sm text-gray-700 dark:text-white">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedProducts(prev => prev.filter(id => id !== prod._id));
                                } else {
                                  setSelectedProducts(prev => [...prev, prod._id]);
                                }
                              }}
                              className="rounded text-primary focus:ring-primary dark:bg-gray-800 dark:border-gray-600"
                            />
                            <span className="font-medium truncate">{prod.name} ({prod.sku})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Conditional Field: Buy X Get % discount on Y Config */}
              {applyType === 'buy_x_get_y' && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-3">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Thiết lập Mua X giảm % Y</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-gray-300">Sản phẩm mua (X)</label>
                      <select {...register('buyProductId')} className="w-full px-3 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" required={applyType === 'buy_x_get_y'}>
                        <option value="">-- Chọn sản phẩm X --</option>
                        {allProducts.map((prod: any) => (
                          <option key={prod._id} value={prod._id}>{prod.name} ({prod.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-gray-300">Số lượng mua tối thiểu (X)</label>
                      <input type="number" {...register('buyQty')} min="1" className="w-full px-3 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" required={applyType === 'buy_x_get_y'} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-gray-300">Sản phẩm được giảm (Y)</label>
                      <select {...register('getProductId')} className="w-full px-3 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" required={applyType === 'buy_x_get_y'}>
                        <option value="">-- Chọn sản phẩm Y --</option>
                        {allProducts.map((prod: any) => (
                          <option key={prod._id} value={prod._id}>{prod.name} ({prod.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-gray-300">Mức giảm % cho Y</label>
                      <input type="number" {...register('discountYValue')} min="1" max="100" className="w-full px-3 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" required={applyType === 'buy_x_get_y'} />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-purple-200 dark:border-purple-800/60">
                    <div>
                      <label className="text-xs font-bold text-purple-900 dark:text-purple-300 block">Chế độ Đệ quy</label>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium leading-relaxed">
                        • <b>Bật Đệ quy</b>: Mua 1 tặng 1, Mua 2 tặng 2, Mua 10 tặng 10 (nhân ưu đãi theo bội số số lượng X).<br/>
                        • <b>Tắt Đệ quy</b>: Mua 1 tặng 1, Mua 2 tặng 1, Mua 10 tặng 1 (chỉ áp dụng ưu đãi cho tối đa 1 sản phẩm Y).
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input type="checkbox" {...register('isRecursive')} className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {applyType !== 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Loại giảm giá</label>
                    <select {...register('type')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                      <option value="percent">Theo %</option>
                      <option value="fixed">Số tiền cố định (VNĐ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Mức giảm</label>
                    <input type="number" {...register('value')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" required={applyType !== 'buy_x_get_y'} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Đơn hàng tối thiểu (VNĐ)</label>
                <input type="number" {...register('minOrderValue')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Ngày bắt đầu</label>
                  <input type="datetime-local" {...register('startDate')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Ngày kết thúc</label>
                  <input type="datetime-local" {...register('endDate')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tổng số lượng Voucher</label>
                  <input type="number" {...register('usageLimit')} placeholder="Để trống nếu vô hạn" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Số lượng dùng tối đa / Khách</label>
                  <input type="number" {...register('limitPerUser')} placeholder="Để trống nếu vô hạn" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Trạng thái</label>
                  <select {...register('status')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                    <option value="active">Đang Bật</option>
                    <option value="inactive">Đã Tắt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Hiển thị ở trang Ưu đãi</label>
                  <select {...register('isVisible')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                    <option value="true">Hiển thị</option>
                    <option value="false">Ẩn (Chỉ dùng MiniGame)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm">Huỷ</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">{mutation.isPending ? 'Đang lưu...' : 'Lưu Khuyến mãi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Promotions;
