import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { 
  Package, 
  ShoppingBag, 
  Zap, 
  Star, 
  ChevronRight, 
  ChevronLeft,
  Minus, Plus, 
  Tag,
  CheckCircle2
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { customer } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-product', id],
    queryFn: () => shopService.getProductDetail(id!),
    enabled: !!id
  });

  const product = data?.data;
  const related = data?.related || [];
  const vouchers = data?.vouchers || [];

  // Gallery
  const [activeImg, setActiveImg] = useState(0);

  // Variant selection - support multi-level
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError || !product) return (
    <div className="text-center py-24 text-gray-400">
      <Package size={48} className="mx-auto opacity-20 mb-2" />
      <p className="text-sm font-bold">Không tìm thấy sản phẩm</p>
      <Link to="/catalog" className="text-primary text-xs hover:underline mt-2 inline-block">Quay về cửa hàng</Link>
    </div>
  );

  // Resolve selected variant
  const resolveSelectedVariant = () => {
    if (!product.variants || product.variants.length === 0) return null;
    
    const attrKeys = Object.keys(selectedAttrs);
    if (attrKeys.length === 0) return null;

    return product.variants.find((v: any) => {
      return attrKeys.every(key => {
        const attrEntry = v.attributes?.find((a: any) => a.key === key);
        return attrEntry && attrEntry.value === selectedAttrs[key];
      });
    }) || null;
  };

  const selectedVariant = resolveSelectedVariant();
  const displayPrice = selectedVariant?.price ?? product.priceSale;
  const displayStock = selectedVariant?.stock ?? product.variants.reduce((sum: number, v: any) => sum + v.stock, 0);

  // Get unique attribute keys and values from all variants
  const attrKeys = product.variants && product.variants.length > 0
    ? [...new Set(product.variants.flatMap((v: any) => v.attributes?.map((a: any) => a.key) || []))] as string[]
    : [];

  const getValuesForAttr = (key: string): string[] => {
    const values = product.variants
      .flatMap((v: any) => v.attributes?.filter((a: any) => a.key === key).map((a: any) => a.value) || []);
    return [...new Set(values)] as string[];
  };

  const handleAttrSelect = (key: string, value: string) => {
    setSelectedAttrs(prev => ({ ...prev, [key]: value }));
  };

  const handleAddToCart = () => {
    if (!customer) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }
    if (attrKeys.length > 0 && !selectedVariant) {
      alert('Vui lòng chọn phân loại sản phẩm trước khi thêm vào giỏ!');
      return;
    }
    addItem({
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        images: product.images,
        priceSale: product.priceSale,
        priceCompare: product.priceCompare
      },
      variantSku: selectedVariant?.sku || null,
      qty,
      price: displayPrice,
      selectedAttributes: Object.entries(selectedAttrs).map(([key, value]) => ({ key, value }))
    });
    alert(`Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    if (!customer) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }
    if (attrKeys.length > 0 && !selectedVariant) {
      alert('Vui lòng chọn phân loại sản phẩm trước khi mua!');
      return;
    }
    addItem({
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        images: product.images,
        priceSale: product.priceSale,
        priceCompare: product.priceCompare
      },
      variantSku: selectedVariant?.sku || null,
      qty,
      price: displayPrice,
      selectedAttributes: Object.entries(selectedAttrs).map(([key, value]) => ({ key, value }))
    });
    navigate('/checkout');
  };

  return (
    <div className="space-y-10 pb-16">
      
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <ChevronRight size={10} />
        <Link to="/catalog" className="hover:text-primary transition-colors">Sản phẩm</Link>
        <ChevronRight size={10} />
        <span className="text-gray-600 dark:text-gray-300 font-bold line-clamp-1">{product.name}</span>
      </nav>

      {/* Main product layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left: Image gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img 
                src={`${API_BASE}${product.images[activeImg]}`} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Package size={64} />
              </div>
            )}

            {/* Prev/Next image arrows */}
            {product.images && product.images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImg(prev => (prev - 1 + product.images.length) % product.images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setActiveImg(prev => (prev + 1) % product.images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImg(idx)}
                  className={`shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                    idx === activeImg ? 'border-primary' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img src={`${API_BASE}${img}`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product info & selection */}
        <div className="space-y-6">
          
          {/* Product title & SKU */}
          <div className="space-y-1.5">
            <div className="flex gap-2 flex-wrap">
              {product.isFeatured && (
                <span className="bg-yellow-100 text-yellow-700 text-[9px] font-black px-2 py-1 rounded-md flex items-center gap-1 uppercase">
                  <Star size={10} fill="currentColor" /> Nổi bật
                </span>
              )}
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-[9px] font-mono font-bold px-2 py-1 rounded-md">SKU: {product.sku}</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white leading-snug">{product.name}</h1>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black text-primary dark:text-indigo-400">{displayPrice.toLocaleString()}đ</span>
            {product.priceCompare > 0 && product.priceCompare > displayPrice && (
              <>
                <span className="text-sm text-gray-400 line-through font-medium">{product.priceCompare.toLocaleString()}đ</span>
                <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  -{Math.round((1 - displayPrice / product.priceCompare) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Stock availability */}
          <div className={`text-xs font-bold flex items-center gap-1.5 ${displayStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
            <CheckCircle2 size={14} />
            {displayStock > 0 ? `Còn hàng (${displayStock} sản phẩm)` : 'Hết hàng'}
          </div>

          {/* Variant attribute selectors */}
          {attrKeys.map(key => (
            <div key={key} className="space-y-2">
              <h4 className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                {key}: <span className="font-bold text-primary">{selectedAttrs[key] || '—'}</span>
              </h4>
              <div className="flex gap-2 flex-wrap">
                {getValuesForAttr(key).map(val => (
                  <button
                    key={val}
                    onClick={() => handleAttrSelect(key, val)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      selectedAttrs[key] === val
                        ? 'border-primary bg-indigo-50 dark:bg-indigo-950 text-primary'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Qty control */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider">Số lượng</h4>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-10 text-center font-bold text-sm">{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(displayStock, q + 1))}
                className="w-9 h-9 flex items-center justify-center border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <button
              onClick={handleAddToCart}
              disabled={displayStock === 0}
              className="flex-1 py-3 border-2 border-primary text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={16} /> Thêm vào giỏ
            </button>
            <button
              onClick={handleBuyNow}
              disabled={displayStock === 0}
              className="flex-1 py-3 bg-primary hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={16} fill="currentColor" /> Mua ngay
            </button>
          </div>

          {/* Related vouchers */}
          {vouchers.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 p-4 rounded-2xl space-y-2.5">
              <h4 className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={14} /> Mã giảm giá áp dụng được
              </h4>
              <div className="space-y-2">
                {vouchers.map((v: any) => (
                  <div key={v._id} className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border dark:border-gray-700">
                    <div>
                      <span className="font-mono text-xs font-extrabold text-orange-600 dark:text-orange-400">{v.code}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Giảm {v.type === 'percent' ? `${v.value}%` : `${v.value.toLocaleString()}đ`} · Đơn tối thiểu {v.minOrderValue.toLocaleString()}đ
                      </p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(v.code)}
                      className="text-[10px] font-black text-orange-500 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      Sao chép
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="space-y-2 border-t dark:border-gray-700 pt-4">
              <h4 className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider">Mô tả sản phẩm</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="space-y-4 border-t dark:border-gray-700 pt-8">
          <h3 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider">Sản phẩm liên quan</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {related.map((prod: any) => (
              <Link
                key={prod._id}
                to={`/product/${prod._id}`}
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-md transition-all group"
              >
                <div className="aspect-square bg-gray-50 dark:bg-gray-750 overflow-hidden">
                  {prod.images && prod.images.length > 0 ? (
                    <img src={`${API_BASE}${prod.images[0]}`} alt={prod.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={32}/></div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-white line-clamp-2 leading-snug">{prod.name}</h4>
                  <p className="text-xs font-extrabold text-primary dark:text-indigo-400 mt-1">{prod.priceSale.toLocaleString()}đ</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default ProductDetail;
