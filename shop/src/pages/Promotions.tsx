import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import { Ticket, Copy, Check, Calendar, ArrowRight, HelpCircle, ShieldAlert, X } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

interface Promotion {
  _id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  status: string;
  applyType: 'product' | 'order' | 'shipping' | 'buy_x_get_y';
  applyProductIds?: any[];
  buyProductId?: any;
  buyQty?: number;
  getProductId?: any;
  discountYValue?: number;
}

export const Promotions = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  useEffect(() => {
    shopService.getActivePromotions()
      .then(res => {
        setPromotions(res.data || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation(); // Prevent opening details modal when copying
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-8 sm:p-12 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative max-w-2xl text-left space-y-4">
          <span className="bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            Độc quyền của Shop
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight uppercase">
            Kho Ưu Đãi & Mã Giảm Giá
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100 font-medium max-w-lg">
            Khám phá các chương trình ưu đãi hiện hành, lưu mã giảm giá và áp dụng ngay trong giỏ hàng để nhận chiết khấu trực tiếp lên đơn hàng của bạn.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-400">Đang tải danh sách ưu đãi...</p>
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-8 space-y-4">
          <Ticket size={48} className="mx-auto text-gray-300 dark:text-gray-600 animate-bounce" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-gray-700 dark:text-gray-300">Không tìm thấy mã ưu đãi nào</h3>
            <p className="text-xs text-gray-450 dark:text-gray-450">Hiện tại hệ thống chưa phát hành mã voucher nào mới. Quay lại sau nhé!</p>
          </div>
          <button 
            onClick={() => navigate('/catalog')}
            className="px-6 py-2.5 bg-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            Khám phá sản phẩm <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promotions.map((promo) => {
            const isCopied = copiedCode === promo.code;
            return (
              <div
                key={promo._id}
                onClick={() => setSelectedPromo(promo)}
                className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-3xl p-6 flex gap-6 items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
              >
                {/* Real Ticket side cut-outs */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 bg-gray-50 dark:bg-gray-900 rounded-full border-r border-gray-100 dark:border-gray-750" />
                <div className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 bg-gray-50 dark:bg-gray-900 rounded-full border-l border-gray-100 dark:border-gray-750" />
                
                {/* Left side: Voucher image or value badge */}
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-750 dark:to-gray-750 rounded-2xl flex flex-col items-center justify-center text-primary dark:text-indigo-400 shrink-0 shadow-sm border border-indigo-50 dark:border-gray-700 overflow-hidden">
                  {promo.image ? (
                    <img src={promo.image.startsWith('http') ? promo.image : `${API_BASE}${promo.image}`} alt={promo.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Ticket size={24} className="mb-1 text-purple-500" />
                      <span className="text-xs font-black">
                        {promo.type === 'percent' ? `${promo.value}%` : `${Math.floor(promo.value / 1000)}k`}
                      </span>
                      <span className="text-[7px] font-black uppercase text-gray-400 tracking-wider">Voucher</span>
                    </>
                  )}
                </div>

                {/* Center: Voucher details summary */}
                <div className="flex-1 text-left min-w-0 space-y-1.5 pl-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                      {promo.code}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold">
                      Đơn tối thiểu {promo.minOrderValue?.toLocaleString()}đ
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-gray-800 dark:text-white line-clamp-1 group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
                    {promo.name}
                  </h3>
                  <p className="text-[10px] text-gray-450 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {promo.description || 'Không có mô tả chi tiết cho mã giảm giá này.'}
                  </p>

                  <div className="flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                    <Calendar size={10} />
                    <span>HSD: {new Date(promo.endDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                {/* Right side: Actions */}
                <div className="shrink-0 flex flex-col items-center gap-2 pl-2">
                  <button
                    onClick={(e) => handleCopyCode(e, promo.code)}
                    className={`py-2 px-4 rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm ${
                      isCopied
                        ? 'bg-green-500 text-white'
                        : 'bg-primary hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isCopied ? (
                      <><Check size={10} /> Đã lưu</>
                    ) : (
                      <><Copy size={10} /> Lưu mã</>
                    )}
                  </button>
                  <span className="text-[9px] text-primary dark:text-indigo-400 font-bold group-hover:underline flex items-center gap-0.5">
                    Xem chi tiết →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED MODAL FOR SELECTED VOUCHER */}
      {selectedPromo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
              <div className="flex items-center gap-2">
                <Ticket className="text-amber-500" size={18} />
                <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Chi tiết Voucher</h3>
              </div>
              <button 
                onClick={() => setSelectedPromo(null)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-gray-500 dark:text-gray-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-left">
              {/* Top summary box */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Mã giảm giá</p>
                <h2 className="text-xl font-black mt-1 font-mono tracking-wider select-all">{selectedPromo.code}</h2>
                <div className="border-t border-white/20 my-3"></div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-indigo-200 font-bold">Mức giảm giá</p>
                    <p className="text-lg font-black mt-0.5">
                      Giảm {selectedPromo.type === 'percent' ? `${selectedPromo.value}%` : `${selectedPromo.value?.toLocaleString()}đ`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { handleCopyCode(e, selectedPromo.code); }}
                    className={`py-1.5 px-4 rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 ${
                      copiedCode === selectedPromo.code
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {copiedCode === selectedPromo.code ? (
                      <><Check size={10} /> Đã lưu</>
                    ) : (
                      <><Copy size={10} /> Sao chép mã</>
                    )}
                  </button>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-primary"/> Điều kiện sử dụng
                </h4>

                <div className="space-y-3 bg-gray-50 dark:bg-gray-750/30 rounded-2xl p-4 border dark:border-gray-750 text-xs font-bold text-gray-700 dark:text-gray-200">
                  <div className="flex justify-between py-1 border-b dark:border-gray-750">
                    <span className="text-gray-400">Tên ưu đãi</span>
                    <span>{selectedPromo.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b dark:border-gray-750">
                    <span className="text-gray-400">Đơn hàng tối thiểu</span>
                    <span className="text-primary dark:text-indigo-400">{selectedPromo.minOrderValue?.toLocaleString()}đ</span>
                  </div>
                  {selectedPromo.maxDiscountAmount ? (
                    <div className="flex justify-between py-1 border-b dark:border-gray-750">
                      <span className="text-gray-400">Giảm tối đa</span>
                      <span>{selectedPromo.maxDiscountAmount?.toLocaleString()}đ</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between py-1 border-b dark:border-gray-750">
                    <span className="text-gray-400">Loại Voucher</span>
                    <span>
                      {selectedPromo.applyType === 'order' && 'Toàn đơn hàng'}
                      {selectedPromo.applyType === 'product' && 'Theo sản phẩm'}
                      {selectedPromo.applyType === 'shipping' && 'Phí vận chuyển'}
                      {selectedPromo.applyType === 'buy_x_get_y' && 'Mua X giảm % Y'}
                    </span>
                  </div>

                  {/* Product-specific voucher */}
                  {selectedPromo.applyType === 'product' && selectedPromo.applyProductIds && selectedPromo.applyProductIds.length > 0 && (
                    <div className="py-1 border-b dark:border-gray-750 space-y-1">
                      <span className="text-gray-400">Áp dụng cho sản phẩm</span>
                      <div className="space-y-0.5 mt-1">
                        {selectedPromo.applyProductIds.map((prod: any) => (
                          <div key={prod._id || prod} className="text-primary dark:text-indigo-400 text-[10px] font-bold">
                            • {prod.name || prod}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buy X get Y conditions */}
                  {selectedPromo.applyType === 'buy_x_get_y' && (
                    <>
                      <div className="flex justify-between py-1 border-b dark:border-gray-750">
                        <span className="text-gray-400">Sản phẩm điều kiện (X)</span>
                        <span className="text-right">{selectedPromo.buyProductId?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b dark:border-gray-750">
                        <span className="text-gray-400">Số lượng mua tối thiểu</span>
                        <span>{selectedPromo.buyQty || 1} sản phẩm</span>
                      </div>
                      <div className="flex justify-between py-1 border-b dark:border-gray-750">
                        <span className="text-gray-400">Sản phẩm được giảm (Y)</span>
                        <span className="text-right">{selectedPromo.getProductId?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b dark:border-gray-750">
                        <span className="text-gray-400">Mức giảm cho Y</span>
                        <span className="text-green-600 dark:text-green-400 font-black">{selectedPromo.discountYValue}%</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between py-1 border-b dark:border-gray-750">
                    <span className="text-gray-400">Bắt đầu từ</span>
                    <span>{new Date(selectedPromo.startDate).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-400">Hạn sử dụng đến</span>
                    <span>{new Date(selectedPromo.endDate).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Description */}
              {selectedPromo.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-primary"/> Mô tả chi tiết
                  </h4>
                  <p className="text-xs font-medium leading-relaxed text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-750/30 border dark:border-gray-750 rounded-2xl p-4">
                    {selectedPromo.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Promotions;
