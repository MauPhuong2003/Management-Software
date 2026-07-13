import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService } from '../services/warehouseService';
import { productService } from '../services/productService';
import { Plus, Edit2, Trash2, Folder, X } from 'lucide-react';
import { useForm } from 'react-hook-form';

const API_BASE = 'http://localhost:5000';

const Warehouses = () => {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseService.getWarehouses });

  const { data: productsData } = useQuery({ 
    queryKey: ['products-all'], 
    queryFn: () => productService.getProducts({ limit: 1000 }) 
  });
  const allProducts = productsData?.data || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm();

  const [warehouseProducts, setWarehouseProducts] = useState<any[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');

  const mutation = useMutation({
    mutationFn: (formData: any) => {
      const payload = {
        ...formData,
        products: warehouseProducts.map(item => ({
          productId: item.productId,
          variantSku: item.variantSku,
          stock: Number(item.stock) || 0
        }))
      };
      if (editingWarehouse) return warehouseService.updateWarehouse(editingWarehouse._id, payload);
      return warehouseService.createWarehouse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      setIsModalOpen(false);
      reset();
      setEditingWarehouse(null);
      setWarehouseProducts([]);
      setSelectedProductToAdd('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: warehouseService.deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
    }
  });

  const addProductToWarehouse = (productId: string) => {
    if (!productId) return;
    const prod = allProducts.find((p: any) => p._id === productId);
    if (!prod) return;
    
    setWarehouseProducts(prev => {
      const copy = [...prev];
      if (prod.variants && prod.variants.length > 0) {
        prod.variants.forEach((v: any) => {
          const exists = copy.some(item => item.productId === prod._id && item.variantSku === v.sku);
          if (!exists) {
            copy.push({
              productId: prod._id,
              productName: prod.name,
              productImage: prod.images?.[0] || '',
              variantSku: v.sku,
              variantLabel: v.attributes?.map((a: any) => a.value).join(' / ') || 'Bản phối',
              stock: 0
            });
          }
        });
      } else {
        const exists = copy.some(item => item.productId === prod._id && item.variantSku === prod.sku);
        if (!exists) {
          copy.push({
            productId: prod._id,
            productName: prod.name,
            productImage: prod.images?.[0] || '',
            variantSku: prod.sku || 'SKU',
            variantLabel: 'Bản tiêu chuẩn',
            stock: 0
          });
        }
      }
      return copy;
    });
    setSelectedProductToAdd('');
  };

  const handleStockChange = (idx: number, stockVal: string) => {
    const num = Number(stockVal) || 0;
    setWarehouseProducts(prev => prev.map((item, i) => i === idx ? { ...item, stock: num } : item));
  };

  const removeWarehouseProduct = (idx: number) => {
    setWarehouseProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const openModal = (warehouse: any = null) => {
    setEditingWarehouse(warehouse);
    if (warehouse) {
      reset({
        name: warehouse.name || '',
        code: warehouse.code || '',
        address: warehouse.address || '',
        phone: warehouse.phone || '',
        status: warehouse.status || 'active'
      });
      
      const initialProducts = warehouse.products ? warehouse.products.map((item: any) => {
        const prodObj = item.productId;
        let variantLabel = 'Bản tiêu chuẩn';
        if (prodObj && prodObj.variants && prodObj.variants.length > 0) {
          const matchingVariant = prodObj.variants.find((v: any) => v.sku === item.variantSku);
          if (matchingVariant && matchingVariant.attributes) {
            variantLabel = matchingVariant.attributes.map((a: any) => a.value).join(' / ');
          }
        }
        return {
          productId: prodObj?._id || item.productId,
          productName: prodObj?.name || 'Sản phẩm',
          productImage: prodObj?.images?.[0] || '',
          variantSku: item.variantSku,
          variantLabel,
          stock: item.stock || 0
        };
      }) : [];
      setWarehouseProducts(initialProducts);
    } else {
      reset({ name: '', code: '', address: '', phone: '', status: 'active' });
      setWarehouseProducts([]);
      setSelectedProductToAdd('');
    }
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Folder className="text-primary" /> Quản lý kho bãi
        </h2>
        {hasPermission('warehouses', 'create') && (
          <button onClick={() => openModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm font-medium cursor-pointer">
            <Plus size={18} /> Thêm kho bãi
          </button>
        )}
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b dark:border-gray-700">
              <th className="p-4 font-medium">Tên kho</th>
              <th className="p-4 font-medium">Mã kho</th>
              <th className="p-4 font-medium">Sản phẩm trong kho</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium w-32">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Đang tải...</td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Không có kho bãi nào</td></tr>
            ) : data?.data?.map((item: any) => (
              <tr key={item._id} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                <td className="p-4 text-gray-800 dark:text-gray-200 font-semibold">{item.name}</td>
                <td className="p-4 text-gray-600 dark:text-gray-400 font-mono font-semibold">{item.code}</td>
                <td className="p-4">
                  {item.products && item.products.length > 0 ? (
                    <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-900/50">
                      {item.products.length} mặt hàng
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs font-semibold">Trống</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {item.status === 'active' ? 'Hoạt động' : 'Đã ẩn'}
                  </span>
                </td>
                <td className="p-4 flex items-center gap-2">
                  {hasPermission('warehouses', 'update') && (
                    <button onClick={() => openModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer" title="Sửa kho"><Edit2 size={16} /></button>
                  )}
                  {hasPermission('warehouses', 'delete') && (
                    <button onClick={() => { if(window.confirm('Xác nhận xoá kho này?')) deleteMutation.mutate(item._id) }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Xoá kho"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl p-6 border border-gray-100 dark:border-gray-700 max-h-[95vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white pb-3 border-b dark:border-gray-700">{editingWarehouse ? 'Sửa kho bãi' : 'Thêm kho bãi'}</h3>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tên kho</label>
                  <input {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Mã kho</label>
                  <input {...register('code')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Địa chỉ</label>
                  <input {...register('address')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Số điện thoại</label>
                  <input {...register('phone')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Trạng thái</label>
                  <select {...register('status')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Đã ẩn</option>
                  </select>
                </div>
              </div>

              {/* Sản phẩm & Tồn kho */}
              <div className="border-t dark:border-gray-700 pt-4 space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Sản phẩm & Tồn kho</h4>
                
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <select 
                      value={selectedProductToAdd} 
                      onChange={(e) => setSelectedProductToAdd(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    >
                      <option value="">-- Chọn sản phẩm để thêm vào kho --</option>
                      {allProducts.map((prod: any) => (
                        <option key={prod._id} value={prod._id}>{prod.name} ({prod.sku})</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => addProductToWarehouse(selectedProductToAdd)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Thêm vào kho
                  </button>
                </div>

                <div className="border dark:border-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold border-b dark:border-gray-700">
                        <th className="p-3">Sản phẩm</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Số lượng tồn</th>
                        <th className="p-3 w-16 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseProducts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-gray-400 dark:text-gray-500">Chưa có sản phẩm nào trong kho này. Hãy chọn sản phẩm ở trên để thêm.</td>
                        </tr>
                      ) : (
                        warehouseProducts.map((item, idx) => (
                          <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {item.productImage ? (
                                  <img src={`${API_BASE}${item.productImage}`} alt={item.productName} className="w-8 h-8 object-cover rounded border dark:border-gray-600" />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded border dark:border-gray-600 flex items-center justify-center text-gray-400"><Folder size={12}/></div>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">{item.productName}</span>
                                  {item.variantLabel && (
                                    <span className="text-[10px] text-gray-400 font-medium">{item.variantLabel}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-gray-600 dark:text-gray-400 font-mono font-medium">{item.variantSku}</td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                value={item.stock} 
                                onChange={(e) => handleStockChange(idx, e.target.value)}
                                className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                min="0"
                                required
                              />
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                type="button" 
                                onClick={() => removeWarehouseProduct(idx)}
                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">Huỷ</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">{mutation.isPending ? 'Đang lưu...' : 'Lưu kho bãi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
