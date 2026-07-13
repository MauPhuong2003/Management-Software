import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { loyaltyService } from '../services/loyaltyService';
import { Eye, X, FileText, CheckCircle, Truck, MapPin, XCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const maskPhone = (phone: string) => {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  return '****' + clean.slice(-4);
};

const Orders = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => orderService.getOrders({ limit: 50 }) });

  const { data: loyaltyConfig } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: loyaltyService.getConfig
  });
  const tiers = loyaltyConfig?.data?.tiers || [];

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => orderService.updateOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
      case 'shipping': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'shipping': return 'Đang giao hàng';
      case 'delivered': return 'Đã hoàn thành';
      case 'cancelled': return 'Đã huỷ';
      default: return status;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Quản lý Đơn hàng</h2>
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
              <th className="p-4 font-medium border-b dark:border-gray-700">Mã đơn</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Khách hàng</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Nguồn</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Tổng tiền</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Trạng thái</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Thanh toán</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Ngày tạo</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="p-4 text-center text-gray-500">Đang tải...</td></tr> : data?.data?.map((order: any) => (
              <tr key={order._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-4 text-gray-800 dark:text-gray-200 font-bold">{order.orderCode}</td>
                <td className="p-4 text-gray-600 dark:text-gray-400">{order.customer?.name || 'Khách vãng lai'}</td>
                <td className="p-4">
                  {order.orderSource === 'pos' ? (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-xs font-semibold">
                      💻 Mini POS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 text-xs font-semibold">
                      🌐 Website
                    </span>
                  )}
                </td>
                <td className="p-4 text-primary font-bold">{order.totalAmount.toLocaleString()}đ</td>
                <td className="p-4">
                  {order.orderStatus === 'delivered' || order.orderStatus === 'cancelled' ? (
                    <span className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold border-0 ${getStatusColor(order.orderStatus)} inline-block`}>
                      {getStatusText(order.orderStatus)}
                    </span>
                  ) : (
                    <select 
                      value={order.orderStatus}
                      onChange={(e) => statusMutation.mutate({ id: order._id, status: e.target.value })}
                      disabled={statusMutation.isPending}
                      className={`px-2 py-1.5 rounded-lg text-sm font-medium outline-none border-0 ${getStatusColor(order.orderStatus)} cursor-pointer`}
                    >
                      <option value="pending">Chờ xác nhận</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="shipping">Đang giao</option>
                      <option value="delivered">Đã hoàn thành</option>
                      <option value="cancelled">Đã huỷ</option>
                    </select>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1.5 items-start">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'}`}>
                      {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 px-1.5 py-0.5 rounded">
                      {order.paymentMethod === 'cash' ? '💵 Tiền mặt' : 
                       order.paymentMethod === 'transfer' ? '💳 Chuyển khoản' : 
                       order.paymentMethod || 'Tiền mặt'}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                  {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => { setSelectedOrder(order); setIsDetailModalOpen(true); }}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl p-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700 mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="text-primary" /> Chi tiết đơn hàng: <span className="text-primary font-extrabold">{selectedOrder.orderCode}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsDetailModalOpen(false); setSelectedOrder(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Order Info */}
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl space-y-2.5 text-sm dark:bg-gray-700/30 border dark:border-gray-700/50">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-1.5">Thông tin đơn hàng</h4>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày tạo:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Trạng thái:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(selectedOrder.orderStatus)}`}>
                    {getStatusText(selectedOrder.orderStatus)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Thanh toán:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'}`}>
                    {selectedOrder.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hình thức:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedOrder.paymentMethod === 'cash' ? '💵 Tiền mặt' : 
                     selectedOrder.paymentMethod === 'transfer' ? '💳 Chuyển khoản' : 
                     selectedOrder.paymentMethod || 'Tiền mặt'}
                  </span>
                </div>
                {selectedOrder.note && (
                  <div className="pt-1.5 border-t dark:border-gray-700 text-xs text-gray-500">
                    <b>Ghi chú:</b> {selectedOrder.note}
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl space-y-2.5 text-sm dark:bg-gray-700/30 border dark:border-gray-700/50">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-1.5">Thông tin khách hàng</h4>
                {selectedOrder.customer ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tên:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedOrder.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SĐT:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">{maskPhone(selectedOrder.customer.phone) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-300 break-all">{selectedOrder.customer.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Địa chỉ:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-right max-w-[180px] truncate" title={selectedOrder.customer.address || 'Chưa cập nhật'}>
                        {selectedOrder.customer.address || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs italic pb-6">
                    Khách vãng lai (Không có thông tin thành viên)
                  </div>
                )}
              </div>
            </div>

            {/* Products List */}
            <div className="border dark:border-gray-700 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold border-b dark:border-gray-700">
                    <th className="p-3 w-12">Ảnh</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Mã SKU</th>
                    <th className="p-3">Đơn giá</th>
                    <th className="p-3 w-16 text-center">SL</th>
                    <th className="p-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item: any, idx: number) => {
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
                        <td className="p-3 font-semibold text-gray-800 dark:text-gray-200 align-middle">
                          {item.product?.name || 'Sản phẩm đã bị xóa'}
                        </td>
                        <td className="p-3 text-gray-500 dark:text-gray-400 font-mono font-medium align-middle">{item.product?.sku || 'N/A'}</td>
                        <td className="p-3 text-gray-700 dark:text-gray-300 align-middle">{item.price.toLocaleString()}đ</td>
                        <td className="p-3 text-center font-medium text-gray-800 dark:text-gray-200 align-middle">{item.qty}</td>
                        <td className="p-3 text-right font-bold text-gray-900 dark:text-white align-middle">{(item.price * item.qty).toLocaleString()}đ</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            {(() => {
              const subtotal = selectedOrder.items?.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0) || 0;
              const tierName = selectedOrder.customer?.tier || 'Đồng';
              const tierDiscountPercent = tiers.find((t: any) => t.name === tierName)?.discountPercent || 0;
              const totalRegularDiscount = selectedOrder.discountAmount || 0;
              const memberTierDiscount = Math.min(totalRegularDiscount, Math.round(subtotal * (tierDiscountPercent / 100)));
              const voucherDiscount = Math.max(0, totalRegularDiscount - memberTierDiscount);

              return (
                <div className="flex justify-between items-start pt-4 border-t dark:border-gray-700">
                  <button 
                    type="button" 
                    onClick={() => { setIsDetailModalOpen(false); setSelectedOrder(null); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm cursor-pointer border-0"
                  >
                    Đóng
                  </button>
                  <div className="text-right space-y-2 w-80 text-xs">
                    <div className="flex justify-between text-gray-500 font-medium gap-4">
                      <span>Số tiền ban đầu:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{subtotal.toLocaleString()}đ</span>
                    </div>

                    {memberTierDiscount > 0 && (
                      <div className="flex justify-between text-gray-505 font-medium gap-4">
                        <span>Ưu đãi hạng ({tierName} -{tierDiscountPercent}%):</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">-{memberTierDiscount.toLocaleString()}đ</span>
                      </div>
                    )}

                    {voucherDiscount > 0 && (
                      <div className="flex justify-between text-gray-505 font-medium gap-4">
                        <span>Voucher áp dụng {selectedOrder.promotionCode ? `(${selectedOrder.promotionCode})` : ''}:</span>
                        <span className="text-emerald-600 dark:text-emerald-450 font-semibold">-{voucherDiscount.toLocaleString()}đ</span>
                      </div>
                    )}

                    {selectedOrder.loyaltyDiscount > 0 && (
                      <div className="flex justify-between text-gray-505 font-medium gap-4">
                        <span>Dùng điểm tích luỹ ({selectedOrder.loyaltyPointsUsed || 0} điểm):</span>
                        <span className="text-indigo-650 dark:text-indigo-400 font-semibold">-{selectedOrder.loyaltyDiscount.toLocaleString()}đ</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700 text-sm gap-4">
                      <span className="text-gray-800 dark:text-white font-extrabold">Tổng thanh toán:</span>
                      <span className="text-xl font-extrabold text-primary">{selectedOrder.totalAmount?.toLocaleString()}đ</span>
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
};
export default Orders;
