import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { uploadService } from '../services/uploadService';
import { warehouseService } from '../services/warehouseService';
import { Plus, Edit2, Trash2, Upload, X, Package, Layers, Star, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';

const API_BASE = 'http://localhost:5000';

interface OptionGroup {
  name: string;
  values: string[];
}

const getCartesian = (arrays: string[][]): string[][] => {
  return arrays.reduce<string[][]>((a, b) => {
    return a.flatMap(d => b.map(e => [...d, e]));
  }, [[]]);
};

const Products = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['products', page], queryFn: () => productService.getProducts({ page, limit: 20 }) });
  const { data: categories } = useQuery({ queryKey: ['categories-all'], queryFn: () => categoryService.getCategories({ limit: 100 }) });
  
  const { data: warehousesData } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseService.getWarehouses });

  const getWarehouseStocksForSku = (sku: string) => {
    if (!sku || !warehousesData?.data) return [];
    return warehousesData.data
      .map((w: any) => {
        const pEntry = w.products?.find((p: any) => p.variantSku === sku);
        if (pEntry && pEntry.stock > 0) {
          return {
            warehouseName: w.name,
            warehouseCode: w.code,
            stock: pEntry.stock
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const getProductTotalStock = (product: any) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((sum: number, v: any) => {
        let vStock = 0;
        if (warehousesData?.data && warehousesData.data.length > 0) {
          const varStocks = warehousesData.data
            .map((w: any) => w.products?.find((pe: any) => pe.variantSku === v.sku))
            .filter(Boolean);
          if (varStocks.length > 0) {
            vStock = varStocks.reduce((s: number, pe: any) => s + (pe.stock || 0), 0);
          } else {
            vStock = Number(v.stock) || 0;
          }
        } else {
          vStock = Number(v.stock) || 0;
        }
        return sum + vStock;
      }, 0);
    }
    
    if (warehousesData?.data && warehousesData.data.length > 0) {
      const mainStocks = warehousesData.data
        .map((w: any) => w.products?.find((pe: any) => pe.variantSku === product.sku))
        .filter(Boolean);
      if (mainStocks.length > 0) {
        return mainStocks.reduce((sum: number, pe: any) => sum + (pe.stock || 0), 0);
      }
    }
    return product.stock || 0;
  };
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  const [images, setImages] = useState<string[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  // Category custom dropdown states
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  // Bulk apply states
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkPriceCompare, setBulkPriceCompare] = useState('');
  const [bulkWeight, setBulkWeight] = useState('');

  // Bulk import/export states
  const [importResult, setImportResult] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const downloadTemplate = () => {
    const headers = ['Tên sản phẩm', 'Mã SKU', 'Giá bán', 'Giá so sánh', 'Tồn kho', 'Danh mục', 'Hình ảnh', 'Mô tả'];
    const rows = [
      [
        'Áo Thun Nam Cổ Tròn Premium',
        'ATN001',
        '185000',
        '250000',
        '100',
        'Thời trang Nam,Áo nam',
        'https://picsum.photos/500/500?random=1,https://picsum.photos/500/500?random=2',
        'Áo thun cotton co giãn 4 chiều, thấm hút mồ hôi cực tốt.'
      ],
      [
        'Quần Short Jean Nữ Cá Tính',
        'QSJ002',
        '290000',
        '400000',
        '80',
        'Thời trang Nữ,Quần short',
        'https://picsum.photos/500/500?random=3',
        'Quần short jean năng động, tôn dáng trẻ trung.'
      ]
    ];
    const csvContent = "\uFEFF"
      + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'file_mau_nhap_san_pham.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProductsToExcel = async () => {
    try {
      const res = await productService.getProducts({ limit: 1000 });
      const products = res.data || [];
      if (products.length === 0) return alert('Không có sản phẩm nào để xuất');

      const headers = ['Tên sản phẩm', 'Mã SKU', 'Giá bán', 'Giá so sánh', 'Tồn kho', 'Thuộc tính biến thể', 'Lượt bán', 'Danh mục', 'Hình ảnh', 'Trạng thái', 'Mô tả'];
      const rows: any[] = [];

      products.forEach((p: any) => {
        const cats = p.categoryIds && Array.isArray(p.categoryIds) ? p.categoryIds.map((c: any) => c.name || c).join(', ') : '';
        const imgs = p.images && Array.isArray(p.images) ? p.images.join(', ') : '';
        const statusStr = p.status === 'active' ? 'Đang bán' : 'Ngừng bán';

        if (!p.variants || p.variants.length === 0) {
          // Simple product
          rows.push([
            p.name,
            p.sku,
            p.priceSale || 0,
            p.priceCompare || 0,
            0,
            '',
            p.soldCount || 0,
            cats,
            imgs,
            statusStr,
            p.description || ''
          ]);
        } else {
          // Product with variants
          p.variants.forEach((v: any) => {
            const attrStr = v.attributes && Array.isArray(v.attributes) 
              ? v.attributes.map((a: any) => `${a.key}: ${a.value}`).join(', ') 
              : '';
            
            rows.push([
              p.name,
              v.sku,
              v.price || 0,
              v.priceCompare || 0,
              v.stock || 0,
              attrStr,
              p.soldCount || 0,
              cats,
              v.image || imgs,
              v.status === 'active' ? 'Đang bán' : 'Ngừng bán',
              p.description || ''
            ]);
          });
        }
      });

      const csvContent = "\uFEFF"
        + [headers.join(','), ...rows.map((r: any[]) => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Không thể xuất file: ' + err.message);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const parseCSV = (csvText: string) => {
          const lines = [];
          let row = [""];
          let inQuotes = false;
          for (let i = 0; i < csvText.length; i++) {
            const c = csvText[i];
            const next = csvText[i+1];
            if (c === '"') {
              if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (c === ',' && !inQuotes) {
              row.push("");
            } else if ((c === '\r' || c === '\n') && !inQuotes) {
              if (c === '\r' && next === '\n') i++;
              lines.push(row);
              row = [""];
            } else {
              row[row.length - 1] += c;
            }
          }
          if (row.length > 1 || row[0] !== "") {
            lines.push(row);
          }
          return lines;
        };

        const parsedLines = parseCSV(text);
        if (parsedLines.length <= 1) {
          alert('File Excel trống hoặc không có dữ liệu');
          return;
        }

        const headers = parsedLines[0].map((h: string) => h.trim().toLowerCase());
        const nameIdx = headers.indexOf('tên sản phẩm');
        const skuIdx = headers.indexOf('mã sku');
        const priceIdx = headers.indexOf('giá bán');
        const comparePriceIdx = headers.indexOf('giá so sánh');
        const stockIdx = headers.indexOf('tồn kho');
        const categoryIdx = headers.indexOf('danh mục');
        const imageIdx = headers.indexOf('hình ảnh');
        const descIdx = headers.indexOf('mô tả');

        if (nameIdx === -1 || skuIdx === -1 || priceIdx === -1) {
          alert('File mẫu không đúng định dạng. Cần có ít nhất các cột: "Tên sản phẩm", "Mã SKU", "Giá bán"');
          return;
        }

        const payload: any[] = [];
        for (let i = 1; i < parsedLines.length; i++) {
          const line = parsedLines[i];
          if (line.length <= 1 || !line[nameIdx]) continue;

          payload.push({
            name: line[nameIdx]?.trim(),
            sku: line[skuIdx]?.trim(),
            priceSale: parseFloat(line[priceIdx]) || 0,
            priceCompare: parseFloat(line[comparePriceIdx]) || 0,
            stock: parseInt(line[stockIdx]) || 0,
            categoryNames: line[categoryIdx] ? line[categoryIdx].split(',').map((c: string) => c.trim()) : [],
            images: line[imageIdx] ? line[imageIdx].split(',').map((img: string) => img.trim()) : [],
            description: line[descIdx] || ''
          });
        }

        if (payload.length === 0) {
          alert('Không tìm thấy sản phẩm nào trong file');
          return;
        }

        const res = await productService.bulkImportProducts(payload);
        setImportResult(res);
        setIsImportModalOpen(true);
        queryClient.invalidateQueries({ queryKey: ['products'] });
        e.target.value = '';
      } catch (err: any) {
        alert('Lỗi phân tích file: ' + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const { register, handleSubmit, reset, watch } = useForm();
  
  const parentSku = watch('sku');
  const parentPrice = watch('priceSale');
  const parentPriceCompare = watch('priceCompare');

  const mainSkuStocks = getWarehouseStocksForSku(parentSku);
  const totalMainSkuStock = mainSkuStocks.reduce((sum: number, item: any) => sum + item.stock, 0);

  // Reset form states when modal opens
  const openModal = (product: any = null) => {
    setEditingProduct(product);
    setIsCatDropdownOpen(false);
    
    // Safely reconstruct categoryIds
    const initialCats = product && Array.isArray(product.categoryIds)
      ? product.categoryIds.map((c: any) => c?._id || c)
      : (product?.categoryIds ? [product.categoryIds?._id || product.categoryIds] : []);
    setSelectedCats(initialCats);

    if (product) {
      reset({
        name: product.name || '',
        sku: product.sku || '',
        priceSale: product.priceSale || 0,
        priceCompare: product.priceCompare || 0,
        status: product.status || 'active',
        description: product.description || '',
        isFeatured: product.isFeatured || false,
        soldCount: product.soldCount || 0
      });
      
      // Safely set images
      setImages(Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []));
      
      const hasVars = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
      setHasVariants(hasVars);
      setVariants(Array.isArray(product.variants) ? product.variants : []);
      
      // Try to reconstruct optionGroups from attributes safely
      if (hasVars && product.variants[0]?.attributes) {
        const reconstructedGroups: { [key: string]: Set<string> } = {};
        product.variants.forEach((v: any) => {
          if (v && Array.isArray(v.attributes)) {
            v.attributes.forEach((attr: any) => {
              if (attr && attr.key && attr.value) {
                if (!reconstructedGroups[attr.key]) {
                  reconstructedGroups[attr.key] = new Set();
                }
                reconstructedGroups[attr.key].add(attr.value);
              }
            });
          }
        });
        setOptionGroups(Object.keys(reconstructedGroups).map(key => ({
          name: key,
          values: Array.from(reconstructedGroups[key])
        })));
      } else {
        setOptionGroups([{ name: 'Màu sắc', values: [''] }]);
      }
    } else {
      reset({ name: '', sku: '', priceSale: 0, priceCompare: 0, status: 'active', description: '', isFeatured: false, soldCount: 0 });
      setImages([]);
      setHasVariants(false);
      setOptionGroups([{ name: 'Màu sắc', values: [''] }]);
      setVariants([]);
    }
    // Clear bulk fields
    setBulkPrice('');
    setBulkPriceCompare('');
    setBulkWeight('');
    setIsModalOpen(true);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setIsCatDropdownOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Regenerate combinations when optionGroups or basic info changes
  useEffect(() => {
    if (!hasVariants) return;

    const activeGroups = optionGroups.filter(g => g && g.name && g.name.trim() !== '' && g.values && Array.isArray(g.values) && g.values.filter(v => v && v.trim() !== '').length > 0);
    if (activeGroups.length === 0) {
      setVariants([]);
      return;
    }

    const valueArrays = activeGroups.map(g => g.values.filter(v => v && v.trim() !== ''));
    const combos = getCartesian(valueArrays);

    setVariants(prev => {
      const currentPrev = Array.isArray(prev) ? prev : [];
      return combos.map(combo => {
        const attrs = combo.map((val, idx) => ({
          key: activeGroups[idx]?.name || '',
          value: val
        }));

        // Try to match existing variant to keep user input safely
        const existing = currentPrev.find(v => 
          v &&
          Array.isArray(v.attributes) &&
          v.attributes.length === attrs.length &&
          v.attributes.every((a: any) => a && attrs.some((at: any) => at && at.key === a.key && at.value === a.value))
        );

        if (existing) {
          return existing;
        }

        const comboStr = combo.join('-');
        return {
          sku: `${parentSku || 'SKU'}-${comboStr}`,
          price: Number(parentPrice) || 0,
          priceCompare: Number(parentPriceCompare) || 0,
          stock: 0,
          barcode: '',
          weight: 0,
          status: 'active',
          image: '',
          attributes: attrs
        };
      });
    });
  }, [optionGroups, hasVariants, parentSku, parentPrice, parentPriceCompare]);

  // Option Group Actions
  const addOptionGroup = () => {
    setOptionGroups(prev => [...prev, { name: '', values: [''] }]);
  };

  const removeOptionGroup = (idx: number) => {
    setOptionGroups(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGroupNameChange = (idx: number, name: string) => {
    setOptionGroups(prev => prev.map((group, gIdx) => 
      gIdx === idx ? { ...group, name } : group
    ));
  };

  const handleGroupValueChange = (gIdx: number, vIdx: number, val: string) => {
    setOptionGroups(prev => prev.map((group, idx) => 
      idx === gIdx 
        ? { ...group, values: group.values.map((v, i) => i === vIdx ? val : v) }
        : group
    ));
  };

  const addGroupValue = (gIdx: number) => {
    setOptionGroups(prev => prev.map((group, idx) => 
      idx === gIdx ? { ...group, values: [...group.values, ''] } : group
    ));
  };

  const removeGroupValue = (gIdx: number, vIdx: number) => {
    setOptionGroups(prev => prev.map((group, idx) => 
      idx === gIdx ? { ...group, values: group.values.filter((_, i) => i !== vIdx) } : group
    ));
  };

  // Image Uploading
  const uploadMutation = useMutation({
    mutationFn: uploadService.uploadImage,
    onSuccess: (data) => {
      setImages((prev) => [...prev, data.data.url]);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Lỗi khi upload ảnh');
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Variant fields changing
  const handleVariantChange = (idx: number, field: string, val: any) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleVariantImageChange = async (idx: number, file: File) => {
    try {
      const res = await uploadService.uploadImage(file);
      handleVariantChange(idx, 'image', res.data.url);
    } catch (error: any) {
      alert('Không thể tải ảnh biến thể');
    }
  };

  // Bulk Apply
  const applyBulk = (field: string, val: string) => {
    if (val.trim() === '') return;
    const num = Number(val);
    setVariants(prev => prev.map(v => ({ ...v, [field]: num })));
  };

  const mutation = useMutation({
    mutationFn: (data: any) => {
      data.priceSale = Number(data.priceSale);
      data.priceCompare = Number(data.priceCompare);
      data.soldCount = Number(data.soldCount || 0);
      data.isFeatured = Boolean(data.isFeatured);
      data.categoryIds = selectedCats;
      data.images = images;
      data.variants = hasVariants ? variants.map(v => {
        const varStocks = getWarehouseStocksForSku(v.sku);
        const hasWarehouseStock = varStocks.length > 0;
        const totalVarStock = hasWarehouseStock 
          ? varStocks.reduce((sum: number, item: any) => sum + item.stock, 0)
          : Number(v.stock) || 0;

        return {
          sku: v.sku,
          price: Number(v.price),
          priceCompare: Number(v.priceCompare),
          stock: totalVarStock,
          barcode: v.barcode,
          weight: Number(v.weight),
          status: v.status,
          image: v.image,
          attributes: v.attributes
        };
      }) : [];

      if (editingProduct) return productService.updateProduct(editingProduct._id, data);
      return productService.createProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      reset();
      setEditingProduct(null);
    },
    onError: (e: any) => {
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  // Fast toggle product isFeatured from table
  const toggleFeaturedMutation = useMutation({
    mutationFn: (product: any) => productService.updateProduct(product._id, { isFeatured: !product.isFeatured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-wrap gap-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Package className="text-primary" /> Quản lý sản phẩm
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={downloadTemplate}
            className="border border-dashed border-gray-300 dark:border-gray-650 hover:border-gray-400 text-gray-500 hover:text-gray-700 dark:text-gray-350 dark:hover:text-gray-250 px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            📋 Tải file mẫu
          </button>
          
          {hasPermission('products', 'create') && (
            <label className="border border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
              📤 Nhập file Excel
              <input 
                type="file" 
                accept=".csv,.xlsx" 
                onChange={handleImportCSV} 
                className="hidden" 
              />
            </label>
          )}

          {hasPermission('products', 'export') && (
            <button 
              onClick={exportProductsToExcel}
              className="border border-emerald-500 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              📥 Xuất file Excel
            </button>
          )}

          {hasPermission('products', 'create') && (
            <button onClick={() => openModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-bold cursor-pointer ml-1">
              <Plus size={18} /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b dark:border-gray-700">
              <th className="p-4 font-medium w-24">Hình ảnh</th>
              <th className="p-4 font-medium">Tên sản phẩm</th>
              <th className="p-4 font-medium">SKU</th>
              <th className="p-4 font-medium">Giá bán</th>
              <th className="p-4 font-medium">Lượt bán</th>
              <th className="p-4 font-medium">Tồn kho</th>
              <th className="p-4 font-medium">Tiêu biểu</th>
              <th className="p-4 font-medium">Biến thể</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium w-32">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="p-4 text-center text-gray-500">Đang tải...</td></tr>
            ) : data?.data?.map((item: any) => (
              <tr key={item._id} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                <td className="p-4">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]?.startsWith('http') ? item.images[0] : `${API_BASE}${item.images[0]}`} alt={item.name} className="w-12 h-12 object-cover rounded-lg border dark:border-gray-700" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400"><Package size={20}/></div>
                  )}
                </td>
                <td className="p-4 text-gray-800 dark:text-gray-200 font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.name}</span>
                    {item.isFeatured && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold w-max mt-1 flex items-center gap-0.5">
                        <Star size={10} className="fill-current"/> Tiêu biểu
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-400">{item.sku}</td>
                 <td className="p-4 font-bold text-primary">{item.priceSale.toLocaleString()}đ</td>
                <td className="p-4 text-gray-600 dark:text-gray-400 font-semibold">{item.soldCount || 0}</td>
                <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                  <div className="flex flex-col">
                    <span>{getProductTotalStock(item).toLocaleString()}</span>
                    {item.variants && item.variants.length > 0 ? (
                      <span className="text-[10px] text-gray-400 font-normal">({item.variants.length} mẫu)</span>
                    ) : (() => {
                      const mainStocks = getWarehouseStocksForSku(item.sku);
                      if (mainStocks.length > 0) {
                        return (
                          <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold block mt-0.5" title={mainStocks.map(s => `${s.warehouseName}: ${s.stock} sp`).join('\n')}>
                            {mainStocks.length} kho
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => toggleFeaturedMutation.mutate(item)}
                    disabled={toggleFeaturedMutation.isPending || !hasPermission('products', 'update')}
                    className={`p-2 rounded-lg transition-colors ${item.isFeatured ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20' : 'text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'} ${!hasPermission('products', 'update') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Star size={18} className={item.isFeatured ? 'fill-current' : ''} />
                  </button>
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  {item.variants && item.variants.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-semibold w-max border border-indigo-100 dark:border-indigo-900">
                      <Layers size={12}/> {item.variants.length} mẫu mã
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Không có</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {item.status === 'active' ? 'Hoạt động' : 'Đã ẩn'}
                  </span>
                </td>
                <td className="p-4 flex items-center gap-2">
                  {hasPermission('products', 'update') && (
                    <button onClick={() => openModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer" title="Sửa sản phẩm"><Edit2 size={16} /></button>
                  )}
                  {hasPermission('products', 'delete') && (
                    <button onClick={() => { if(window.confirm('Xác nhận xoá sản phẩm?')) deleteMutation.mutate(item._id) }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Xoá sản phẩm"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Wrapper */}
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm items-center justify-center z-50 p-4 ${isModalOpen ? 'flex' : 'hidden'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-5xl p-6 border border-gray-100 dark:border-gray-700 max-h-[95vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white pb-3 border-b dark:border-gray-700">{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
          
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
            
            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tên sản phẩm</label>
                <input {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">SKU gốc</label>
                <input {...register('sku')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Giá bán (VNĐ)</label>
                <input type="number" {...register('priceSale')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Giá so sánh (Gốc)</label>
                <input type="number" {...register('priceCompare')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              
              {/* Custom Beautiful Category Dropdown */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Danh mục</label>
                <button
                  type="button"
                  onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                  className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-left flex justify-between items-center text-gray-700 dark:text-white focus:ring-2 focus:ring-primary"
                >
                  <span className="truncate">
                    {selectedCats && selectedCats.length > 0 && categories?.data
                      ? categories?.data?.filter((c: any) => c && selectedCats.includes(c._id)).map((c: any) => c.parentId?.name ? `${c.parentId.name} > ${c.name}` : c.name).join(', ')
                      : 'Chọn danh mục'}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isCatDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-1">
                    <label className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer select-none text-sm text-gray-700 dark:text-white">
                      <input
                        type="radio"
                        name="productCategory"
                        checked={selectedCats.length === 0}
                        onChange={() => setSelectedCats([])}
                        className="text-primary focus:ring-primary dark:bg-gray-800 dark:border-gray-600"
                      />
                      Không chọn danh mục
                    </label>
                    {categories?.data?.length === 0 ? (
                      <p className="text-sm text-gray-400 p-2">Không có danh mục nào</p>
                    ) : (
                      categories?.data?.map((c: any) => {
                        const isChecked = selectedCats && selectedCats.includes(c?._id);
                        return (
                          <label key={c?._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer select-none text-sm text-gray-700 dark:text-white">
                            <input
                              type="radio"
                              name="productCategory"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedCats([c?._id]);
                              }}
                              className="text-primary focus:ring-primary dark:bg-gray-800 dark:border-gray-600"
                            />
                            {c?.parentId?.name ? `${c.parentId.name} > ${c.name}` : c?.name}
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Trạng thái</label>
                <select {...register('status')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Đã ẩn</option>
                </select>
              </div>
              
              {/* Lượt bán hiển thị và Sản phẩm tiêu biểu */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Lượt bán hiển thị</label>
                <input type="number" {...register('soldCount')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="isFeatured" {...register('isFeatured')} className="w-4 h-4 rounded text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600" />
                <label htmlFor="isFeatured" className="text-sm font-medium dark:text-gray-300 select-none cursor-pointer flex items-center gap-1"><Star size={16} className="text-amber-500 fill-current" /> Sản phẩm tiêu biểu</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Mô tả sản phẩm</label>
              <textarea {...register('description')} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
            </div>

            {/* Upload ảnh */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">Hình ảnh sản phẩm</label>
              <div className="flex flex-wrap gap-4 items-center">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 border rounded-xl overflow-hidden dark:border-gray-700 bg-gray-50">
                    <img src={img?.startsWith('http') ? img : `${API_BASE}${img}`} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X size={12} /></button>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors text-gray-500 dark:text-gray-400">
                  <Upload size={24} />
                  <span className="text-xs mt-1">Tải ảnh lên</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={uploadMutation.isPending} />
                </label>
              </div>
            </div>

            {!hasVariants && (
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200">Tồn kho tại các chi nhánh</h4>
                  <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-900/50">
                    Tổng tồn: {totalMainSkuStock} sản phẩm
                  </span>
                </div>
                {mainSkuStocks.length === 0 ? (
                  <p className="text-xs text-gray-400">Sản phẩm này chưa được nhập kho hoặc hết hàng ở tất cả các kho.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {mainSkuStocks.map((wStock: any, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{wStock.warehouseName} ({wStock.warehouseCode})</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{wStock.stock} sản phẩm</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Toggle Variants */}
            <div className="border-t dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <input type="checkbox" id="hasVariants" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} className="rounded text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600" />
                <label htmlFor="hasVariants" className="text-sm font-medium dark:text-gray-300 select-none cursor-pointer">Sản phẩm có nhiều phiên bản/biến thể</label>
              </div>

              {hasVariants && (
                <div className="space-y-6">
                  {/* Section 1: Options Configuration (Mẫu mã) */}
                  <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700 space-y-4">
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200">Mẫu mã</h4>
                    
                    {optionGroups.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 space-y-3 relative">
                        <button type="button" onClick={() => removeOptionGroup(gIdx)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={16}/></button>
                        
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Phân loại {gIdx + 1}</label>
                          <input value={group.name} onChange={(e) => handleGroupNameChange(gIdx, e.target.value)} placeholder="vd: Màu sắc, Kích thước" className="w-1/2 px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">Tùy chọn</label>
                          <div className="space-y-2">
                            {group.values.map((val, vIdx) => (
                              <div key={vIdx} className="flex gap-2 items-center">
                                <input value={val} onChange={(e) => handleGroupValueChange(gIdx, vIdx, e.target.value)} placeholder="vd: Đỏ, Xanh, L, M" className="w-1/2 px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                                <button type="button" onClick={() => addGroupValue(gIdx)} className="p-1.5 border rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white"><Plus size={14}/></button>
                                {group.values.length > 1 && (
                                  <button type="button" onClick={() => removeGroupValue(gIdx, vIdx)} className="p-1.5 border rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:border-red-900"><X size={14}/></button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => addGroupValue(gIdx)} className="text-xs text-primary font-medium hover:underline mt-1 block">Thêm giá trị biến thể</button>
                        </div>
                      </div>
                    ))}

                    {optionGroups.length < 3 && (
                      <button type="button" onClick={addOptionGroup} className="text-sm bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600">Thêm tuỳ chọn khác</button>
                    )}
                  </div>

                  {/* Section 2: Bulk Apply (Áp dụng hàng loạt) */}
                  {variants.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700 space-y-3">
                      <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200">Áp dụng hàng loạt</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Giá</label>
                          <div className="flex gap-2">
                            <input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <button type="button" onClick={() => applyBulk('price', bulkPrice)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Áp dụng</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Giá niêm yết</label>
                          <div className="flex gap-2">
                            <input type="number" value={bulkPriceCompare} onChange={(e) => setBulkPriceCompare(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <button type="button" onClick={() => applyBulk('priceCompare', bulkPriceCompare)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Áp dụng</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Cân nặng (g)</label>
                          <div className="flex gap-2">
                            <input type="number" value={bulkWeight} onChange={(e) => setBulkWeight(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <button type="button" onClick={() => applyBulk('weight', bulkWeight)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Áp dụng</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 3: Variants Table (Danh sách biến thể) */}
                  {variants.length > 0 && (
                    <div className="overflow-x-auto border dark:border-gray-700 rounded-xl">
                      <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <th className="p-3 font-semibold w-24">Hình ảnh</th>
                            <th className="p-3 font-semibold w-32">Tên biến thể</th>
                            <th className="p-3 font-semibold">Giá</th>
                            <th className="p-3 font-semibold">Giá niêm yết</th>
                            <th className="p-3 font-semibold">Tồn kho</th>
                            <th className="p-3 font-semibold">SKU</th>
                            <th className="p-3 font-semibold">Mã vạch</th>
                            <th className="p-3 font-semibold">Cân nặng</th>
                            <th className="p-3 font-semibold w-24">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((v, idx) => (
                            <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                              {/* Hình ảnh */}
                              <td className="p-3">
                                <label className="w-12 h-12 border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary bg-white dark:bg-gray-700 dark:border-gray-600 relative overflow-hidden">
                                  {v.image ? (
                                    <img src={v.image?.startsWith('http') ? v.image : `${API_BASE}${v.image}`} alt="V" className="w-full h-full object-cover" />
                                  ) : (
                                    <>
                                      <Upload size={14} className="text-gray-400" />
                                      <span className="text-[9px] text-gray-400">Tải lên</span>
                                    </>
                                  )}
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleVariantImageChange(idx, e.target.files[0])} />
                                </label>
                              </td>
                              {/* Tên */}
                              <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">
                                {Array.isArray(v.attributes) ? v.attributes.map((a: any) => a?.value).join(' / ') || '/' : '/'}
                              </td>
                              {/* Giá */}
                              <td className="p-3">
                                <input type="number" value={v.price} onChange={(e) => handleVariantChange(idx, 'price', e.target.value)} className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" required />
                              </td>
                              {/* Giá niêm yết */}
                              <td className="p-3">
                                <input type="number" value={v.priceCompare} onChange={(e) => handleVariantChange(idx, 'priceCompare', e.target.value)} className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                              </td>
                              {/* Tồn kho */}
                              <td className="p-3">
                                {(() => {
                                  const varStocks = getWarehouseStocksForSku(v.sku);
                                  const hasWarehouseStock = varStocks.length > 0;
                                  const totalVarStock = hasWarehouseStock 
                                    ? varStocks.reduce((sum: number, item: any) => sum + item.stock, 0)
                                    : Number(v.stock) || 0;
                                  
                                  return hasWarehouseStock ? (
                                    <div className="flex flex-col gap-1 min-w-[120px]">
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{totalVarStock}</span>
                                      <div className="space-y-0.5 max-h-16 overflow-y-auto border border-gray-100 dark:border-gray-700/50 rounded p-1 bg-gray-50 dark:bg-gray-800/40">
                                        {varStocks.map((ws: any, i: number) => (
                                          <span key={i} className="text-[9px] text-gray-500 dark:text-gray-400 block truncate leading-tight" title={`${ws.warehouseName}: ${ws.stock}`}>
                                            {ws.warehouseCode}: <b className="font-semibold text-gray-700 dark:text-gray-300">{ws.stock}</b>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <input 
                                      type="number" 
                                      value={v.stock} 
                                      onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)} 
                                      className="w-16 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                                      required 
                                    />
                                  );
                                })()}
                              </td>
                              {/* SKU */}
                              <td className="p-3">
                                <input value={v.sku} onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)} className="w-28 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white text-xs" required />
                              </td>
                              {/* Mã vạch */}
                              <td className="p-3">
                                <input value={v.barcode || ''} onChange={(e) => handleVariantChange(idx, 'barcode', e.target.value)} className="w-24 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white text-xs" />
                              </td>
                              {/* Cân nặng */}
                              <td className="p-3">
                                <input type="number" value={v.weight} onChange={(e) => handleVariantChange(idx, 'weight', e.target.value)} className="w-16 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                              </td>
                              {/* Trạng thái */}
                              <td className="p-3">
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                  <input type="checkbox" checked={v.status === 'active'} onChange={(e) => handleVariantChange(idx, 'status', e.target.checked ? 'active' : 'inactive')} className="sr-only peer" />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                  <span className="ml-2 text-xs font-medium text-gray-900 dark:text-gray-300">
                                    {v.status === 'active' ? 'Bật' : 'Tắt'}
                                  </span>
                                </label>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Form Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-700 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">Huỷ</button>
              <button type="submit" disabled={mutation.isPending} className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md shadow-primary/20">{mutation.isPending ? 'Đang lưu...' : 'Lưu sản phẩm'}</button>
            </div>
          </form>
        </div>
      </div>
      {/* Import Result Modal */}
      {isImportModalOpen && importResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-150 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                📊 Kết quả nhập file sản phẩm
              </h3>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <p className="text-[10px] text-blue-500 font-bold uppercase">Tổng số hàng</p>
                <p className="text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-1">{importResult.summary?.total || 0}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-[10px] text-emerald-500 font-bold uppercase">Thành công</p>
                <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-450 mt-1">{importResult.summary?.success || 0}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50">
                <p className="text-[10px] text-rose-500 font-bold uppercase">Thất bại</p>
                <p className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-1">{importResult.summary?.failed || 0}</p>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-rose-500 uppercase">Danh sách dòng lỗi ({importResult.errors.length}):</p>
                <div className="max-h-60 overflow-y-auto border border-rose-100 dark:border-gray-700 rounded-xl divide-y divide-gray-50 dark:divide-gray-700/50 bg-rose-50/20 dark:bg-rose-950/5">
                  {importResult.errors.map((err: any, idx: number) => (
                    <div key={idx} className="p-3 text-xs flex flex-col gap-0.5">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-500">Dòng #{err.index + 2}</span>
                        <span className="text-rose-500 font-mono">SKU: {err.sku}</span>
                      </div>
                      <p className="text-rose-600 dark:text-rose-400 mt-1 font-medium">{err.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
