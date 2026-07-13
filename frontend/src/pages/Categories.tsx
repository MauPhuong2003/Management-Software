import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';
import { uploadService } from '../services/uploadService';
import { productService } from '../services/productService';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Folder, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';

const API_BASE = 'http://localhost:5000';

interface CategoryNode {
  _id: string;
  name: string;
  parentId: any;
  status: string;
  image?: string;
  children: CategoryNode[];
}

const Categories = () => {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({ limit: 1000 })
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productService.getProducts({ limit: 1000 })
  });
  const allProducts = productsData?.data || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm();

  const [image, setImage] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const uploadMutation = useMutation({
    mutationFn: uploadService.uploadImage,
    onSuccess: (resData) => {
      setImage(resData.data.url);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Lỗi khi tải ảnh lên');
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  const removeImage = () => {
    setImage('');
  };

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const buildCategoryTree = (flatCategories: any[]): CategoryNode[] => {
    const nodes: CategoryNode[] = flatCategories.map(c => ({
      ...c,
      children: []
    }));
    
    const map = new Map<string, CategoryNode>();
    nodes.forEach(node => map.set(node._id, node));
    
    const tree: CategoryNode[] = [];
    
    nodes.forEach(node => {
      const parentId = node.parentId?._id || node.parentId;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    });
    
    return tree;
  };

  const getRenderRows = (nodes: CategoryNode[], depth = 0): { node: CategoryNode; depth: number }[] => {
    let rows: { node: CategoryNode; depth: number }[] = [];
    nodes.forEach(node => {
      rows.push({ node, depth });
      if (expandedIds.has(node._id) && node.children && node.children.length > 0) {
        rows.push(...getRenderRows(node.children, depth + 1));
      }
    });
    return rows;
  };


  const mutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        parentId: data.parentId || null,
        image: image,
        productIds: selectedProducts
      };
      if (editingCategory) {
        return categoryService.updateCategory(editingCategory._id, payload);
      }
      return categoryService.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      setIsModalOpen(false);
      reset();
      setEditingCategory(null);
      setImage('');
      setSelectedProducts([]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
    }
  });

  const openModal = (category: any = null) => {
    setEditingCategory(category);
    if (category) {
      reset({ 
        name: category.name, 
        status: category.status, 
        parentId: category.parentId?._id || category.parentId || '' 
      });
      setImage(category.image || '');
      
      const initialSelected = allProducts
        .filter((p: any) => p.categoryIds?.some((cat: any) => (cat?._id || cat) === category._id))
        .map((p: any) => p._id);
      setSelectedProducts(initialSelected);
    } else {
      reset({ name: '', status: 'active', parentId: '' });
      setImage('');
      setSelectedProducts([]);
    }
    setIsModalOpen(true);
  };
  const flatCategories = data?.data || [];
  const tree = buildCategoryTree(flatCategories);
  const renderRows = getRenderRows(tree);
  
  // A category can select a parent only if the parent is a root category (no parentId)
  // and the parent is not the category itself.
  const parentCandidates = flatCategories.filter((c: any) => {
    const isRoot = !c.parentId;
    const isNotSelf = !editingCategory || c._id !== editingCategory._id;
    return isRoot && isNotSelf;
  });

  // Check if the category being edited is already a parent (has child categories under it)
  const isEditingCategoryParent = editingCategory && flatCategories.some((c: any) => {
    const pId = c.parentId?._id || c.parentId;
    return pId === editingCategory._id;
  });

  const getProductCategoryLabel = (prod: any) => {
    if (prod.categoryIds && prod.categoryIds.length > 0) {
      const firstCat = prod.categoryIds[0];
      const catName = firstCat?.name || firstCat || '';
      if (catName) {
        if (editingCategory && (firstCat?._id || firstCat) === editingCategory._id) {
          return '';
        }
        return `(Đang ở: ${catName})`;
      }
    }
    return '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Danh mục sản phẩm</h2>
        {hasPermission('categories', 'create') && (
          <button onClick={() => openModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors cursor-pointer">
            <Plus size={18} /> Thêm danh mục
          </button>
        )}
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b dark:border-gray-700">
              <th className="p-4 font-medium w-24">Hình ảnh</th>
              <th className="p-4 font-medium">Tên danh mục</th>
              <th className="p-4 font-medium">Danh mục cha</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Trạng thái</th>
              <th className="p-4 font-medium border-b dark:border-gray-700 w-32">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">Đang tải...</td></tr>
            ) : renderRows.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">Không có danh mục nào</td></tr>
            ) : renderRows.map(({ node, depth }) => {
              const hasChildren = node.children && node.children.length > 0;
              const isExpanded = expandedIds.has(node._id);
              
              return (
                <tr key={node._id} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                  <td className="p-4">
                    {node.image ? (
                      <img src={`${API_BASE}${node.image}`} alt={node.name} className="w-10 h-10 object-cover rounded-lg border dark:border-gray-700" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400"><Folder size={18}/></div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-gray-800 dark:text-gray-200 font-medium" style={{ paddingLeft: `${depth * 24}px` }}>
                      {hasChildren ? (
                        <button 
                          type="button" 
                          onClick={() => toggleExpand(node._id)}
                          className="mr-1.5 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <div className="w-[22px]" />
                      )}
                      <span className="flex items-center gap-1.5">
                        {node.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    {node.parentId?.name ? (
                      <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded text-xs font-semibold border border-indigo-100 dark:border-indigo-900">
                        {node.parentId.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Danh mục gốc</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${node.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {node.status === 'active' ? 'Hoạt động' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    {hasPermission('categories', 'update') && (
                      <button onClick={() => openModal(node)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer" title="Sửa danh mục"><Edit2 size={16} /></button>
                    )}
                    {hasPermission('categories', 'delete') && (
                      <button onClick={() => { if(window.confirm('Xác nhận xoá danh mục?')) deleteMutation.mutate(node._id) }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Xoá danh mục"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white pb-3 border-b dark:border-gray-700">{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tên danh mục</label>
                <input {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Danh mục cha</label>
                {isEditingCategoryParent ? (
                  <div>
                    <select disabled className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 outline-none cursor-not-allowed text-sm">
                      <option value="">Không có (Danh mục gốc)</option>
                    </select>
                    <p className="text-xs text-amber-500 mt-1.5 font-medium">Danh mục này đang chứa danh mục con, bắt buộc phải là Danh mục gốc.</p>
                  </div>
                ) : (
                  <select {...register('parentId')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">Không có (Danh mục gốc)</option>
                    {parentCandidates.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Hình ảnh danh mục</label>
                <div className="flex items-center gap-4">
                  {image ? (
                    <div className="relative w-20 h-20 border rounded-xl overflow-hidden dark:border-gray-700 bg-gray-50 flex items-center justify-center">
                      <img src={`${API_BASE}${image}`} alt="Category" className="w-full h-full object-cover" />
                      <button type="button" onClick={removeImage} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors text-gray-500 dark:text-gray-400">
                      <Upload size={20} />
                      <span className="text-[10px] mt-1">Tải ảnh</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={uploadMutation.isPending} />
                    </label>
                  )}
                  {uploadMutation.isPending && <span className="text-xs text-gray-400">Đang tải ảnh...</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sản phẩm thuộc danh mục</label>
                <div className="border dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 space-y-1">
                  {allProducts.length === 0 ? (
                    <p className="text-xs text-gray-400 p-2">Không có sản phẩm nào</p>
                  ) : (
                    allProducts.map((prod: any) => {
                      const isChecked = selectedProducts.includes(prod._id);
                      const currentCatLabel = getProductCategoryLabel(prod);
                      
                      return (
                        <label key={prod._id} className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer select-none text-sm text-gray-700 dark:text-white">
                          <div className="flex items-center gap-2">
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
                            {prod.images && prod.images.length > 0 ? (
                              <img src={`${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-8 h-8 object-cover rounded border dark:border-gray-600" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded border dark:border-gray-600 flex items-center justify-center text-gray-400"><Folder size={12}/></div>
                            )}
                            <span className="font-medium truncate max-w-[160px]">{prod.name}</span>
                          </div>
                          {currentCatLabel && (
                            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                              {currentCatLabel}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Trạng thái</label>
                <select {...register('status')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Đã ẩn</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">Huỷ</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">{mutation.isPending ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
