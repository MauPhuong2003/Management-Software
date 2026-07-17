import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { loyaltyService } from '../services/loyaltyService';
import { settingService } from '../services/settingService';
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

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingService.getSettings
  });
  const branches = settingsData?.data?.addresses || [];

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  const [adminComment, setAdminComment] = useState('');
  const [isApprovingReturn, setIsApprovingReturn] = useState(false);
  const [isRejectingReturn, setIsRejectingReturn] = useState(false);

  const handleApproveReturn = async (id: string) => {
    if (!confirm('Xác nhận ĐỒNG Ý hoàn hàng & hoàn tiền cho đơn hàng này? Tồn kho và điểm thành viên sẽ tự động được hoàn lại.')) return;
    setIsApprovingReturn(true);
    try {
      await orderService.approveReturn(id, adminComment || 'Đã phê duyệt hoàn hàng & hoàn tiền');
      alert('Đã phê duyệt yêu cầu hoàn trả thành công!');
      setAdminComment('');
      setIsDetailModalOpen(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể phê duyệt yêu cầu hoàn trả');
    } finally {
      setIsApprovingReturn(false);
    }
  };

  const handleRejectReturn = async (id: string) => {
    if (!adminComment.trim()) {
      alert('Vui lòng nhập lý do từ chối cụ thể!');
      return;
    }
    setIsRejectingReturn(true);
    try {
      await orderService.rejectReturn(id, adminComment);
      alert('Đã từ chối yêu cầu hoàn trả thành công!');
      setAdminComment('');
      setIsDetailModalOpen(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể từ chối yêu cầu hoàn trả');
    } finally {
      setIsRejectingReturn(false);
    }
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: string, status?: string, paymentStatus?: string }) => 
      orderService.updateOrderStatus(id, { status, paymentStatus }),
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

  const getStatusText = (status: string, order?: any) => {
    if (status === 'pending' && order && (order.paymentMethod === 'bank_transfer' || order.paymentMethod === 'transfer') && order.paymentStatus === 'pending') {
      return 'Chờ thanh toán';
    }
    switch(status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'shipping': return 'Đang giao hàng';
      case 'delivered': return 'Đã hoàn thành';
      case 'cancelled': return 'Đã huỷ';
      default: return status;
    }
  };

  const getOrderDeliveryDetails = (order: any) => {
    let deliveryType = order.deliveryType || 'shipping';
    let pickupBranch = order.pickupBranch || '';

    if (!order.deliveryType && order.note) {
      const pickupMatch = order.note.match(/\[Nhận tại cửa hàng:\s*([^\]]+)\]/);
      if (pickupMatch) {
        deliveryType = 'pickup';
        pickupBranch = pickupMatch[1];
      }
    }

    return { deliveryType, pickupBranch };
  };

  const resolveBranchName = (pickupBranchStr: string) => {
    if (!pickupBranchStr) return '';
    
    // 1. Match directly by branchName (case-insensitive)
    const matchByName = branches.find((b: any) => b.branchName?.toLowerCase() === pickupBranchStr.toLowerCase());
    if (matchByName) return matchByName.branchName;

    // 2. Match by address (case-insensitive)
    const matchByAddress = branches.find((b: any) => b.address?.toLowerCase() === pickupBranchStr.toLowerCase());
    if (matchByAddress) return matchByAddress.branchName;

    // 3. Fallback partial match (if address contains string or string contains address)
    const partialMatch = branches.find((b: any) => 
      (b.address && pickupBranchStr.toLowerCase().includes(b.address.toLowerCase())) ||
      (b.address && b.address.toLowerCase().includes(pickupBranchStr.toLowerCase()))
    );
    if (partialMatch) return partialMatch.branchName;

    // 4. Default fallback: display name truncated if too long
    return pickupBranchStr.length > 25 ? pickupBranchStr.slice(0, 25) + '...' : pickupBranchStr;
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
              <th className="p-4 font-medium border-b dark:border-gray-700">Ngày tạo</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Đơn hàng</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Khách hàng</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Tổng tiền</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Hình thức thanh toán</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Đơn vị vận chuyển</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Cửa hàng</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Trạng thái đơn hàng</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Trạng thái thanh toán</th>
              <th className="p-4 font-medium border-b dark:border-gray-700">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-500">Đang tải...</td>
              </tr>
            ) : (
              data?.data?.map((order: any) => {
                const { deliveryType, pickupBranch } = getOrderDeliveryDetails(order);
                return (
                  <tr key={order._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {/* 1. Ngày tạo */}
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs font-medium">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </td>

                    {/* 2. Đơn hàng */}
                    <td className="p-4 text-gray-805 dark:text-gray-200 text-xs">
                      <div className="flex flex-col gap-1 items-start font-bold font-mono">
                        <span>{order.orderCode}</span>
                        {order.returnRequest && order.returnRequest.reason && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                            order.returnRequest.status === 'approved'
                              ? 'bg-green-150 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30'
                              : order.returnRequest.status === 'rejected'
                              ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/55 dark:text-gray-400 dark:border-gray-600'
                              : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30 animate-pulse'
                          }`}>
                            🔄 {
                              order.returnRequest.status === 'approved' ? 'Đã hoàn hàng' :
                              order.returnRequest.status === 'rejected' ? 'Từ chối hoàn' : 'Yêu cầu hoàn'
                            }
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Khách hàng */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center font-bold text-primary text-sm uppercase overflow-hidden shrink-0 border dark:border-gray-700">
                          {order.customer?.avatar ? (
                            <img src={order.customer.avatar.startsWith('http') ? order.customer.avatar : `${API_BASE}${order.customer.avatar}`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(order.customer?.name || 'K')[0]}</span>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-xs">{order.customer?.name || 'Khách vãng lai'}</p>
                          {order.customer?.phone && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">{order.customer.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 4. Tổng tiền */}
                    <td className="p-4 text-primary font-extrabold text-sm">{order.totalAmount.toLocaleString()}đ</td>

                    {/* 5. Hình thức thanh toán */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {order.paymentMethod === 'cash' ? 'Tiền mặt (COD)' : 
                           order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 
                           order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 
                           order.paymentMethod.toUpperCase()}
                        </span>
                        {order.orderSource === 'pos' ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[9px] font-bold">
                            💻 Mini POS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 text-[9px] font-bold">
                            🌐 Website
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Đơn vị vận chuyển */}
                    <td className="p-4 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                      {deliveryType === 'pickup' ? (
                        <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-450 text-[10px] font-bold">
                          TakeAway
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 text-[10px] font-bold">
                          Giao hàng
                        </span>
                      )}
                    </td>

                    {/* 7. Cửa hàng */}
                    <td className="p-4 text-gray-750 dark:text-gray-300 text-xs font-bold">
                      {deliveryType === 'pickup' ? (
                        resolveBranchName(pickupBranch) || 'Cửa hàng chính'
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>

                    {/* 8. Trạng thái đơn hàng */}
                    <td className="p-4">
                      {order.orderStatus === 'delivered' || order.orderStatus === 'cancelled' ? (
                        <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-0 ${getStatusColor(order.orderStatus)} inline-block`}>
                          {getStatusText(order.orderStatus, order)}
                        </span>
                      ) : (
                        <select 
                          value={order.orderStatus}
                          onChange={(e) => statusMutation.mutate({ id: order._id, status: e.target.value })}
                          disabled={statusMutation.isPending}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold outline-none border-0 ${getStatusColor(order.orderStatus)} cursor-pointer`}
                        >
                          <option value="pending">
                            {(order.paymentMethod === 'bank_transfer' || order.paymentMethod === 'transfer') && order.paymentStatus === 'pending' ? 'Chờ thanh toán' : 'Chờ xác nhận'}
                          </option>
                          <option value="confirmed">Đã xác nhận</option>
                          <option value="shipping">Đang giao</option>
                          <option value="delivered">Đã hoàn thành</option>
                          <option value="cancelled">Đã huỷ</option>
                        </select>
                      )}
                    </td>

                    {/* 9. Trạng thái thanh toán */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <select 
                          value={order.paymentStatus}
                          onChange={(e) => statusMutation.mutate({ id: order._id, paymentStatus: e.target.value })}
                          disabled={statusMutation.isPending}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border ${
                            order.paymentStatus === 'paid'
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-900/30'
                              : order.paymentStatus === 'refunded'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900/30'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-250 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-900/30'
                          } cursor-pointer`}
                        >
                          <option value="pending">Chưa thanh toán</option>
                          <option value="paid">Đã thanh toán</option>
                          <option value="refunded">Đã hoàn tiền</option>
                        </select>
                        {order.paymentProof && order.paymentStatus === 'pending' && (
                          <button
                            onClick={() => {
                              setProofModalUrl(order.paymentProof);
                              setIsProofModalOpen(true);
                            }}
                            className="text-[10px] font-black text-amber-600 dark:text-amber-400 underline hover:text-amber-700 cursor-pointer border-0 bg-transparent flex items-center gap-1 mt-0.5 animate-pulse"
                          >
                            📄 Xem minh chứng
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 10. Hành động */}
                    <td className="p-4">
                      <button 
                        onClick={() => { setSelectedOrder(order); setIsDetailModalOpen(true); }}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
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
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={e => {
                      statusMutation.mutate({ id: selectedOrder._id, status: e.target.value });
                      setSelectedOrder((prev: any) => ({ ...prev, orderStatus: e.target.value }));
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer appearance-none pr-6 ${getStatusColor(selectedOrder.orderStatus)}`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                  >
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="shipping">Đang giao hàng</option>
                    <option value="delivered">Đã hoàn thành</option>
                    <option value="cancelled">Đã huỷ</option>
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Thanh toán:</span>
                  <select
                    value={selectedOrder.paymentStatus}
                    onChange={e => {
                      statusMutation.mutate({ id: selectedOrder._id, paymentStatus: e.target.value });
                      setSelectedOrder((prev: any) => ({ ...prev, paymentStatus: e.target.value }));
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer appearance-none pr-6 ${
                      selectedOrder.paymentStatus === 'paid'
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                        : selectedOrder.paymentStatus === 'refunded'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                    }`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                  >
                    <option value="pending">Chưa thanh toán</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="refunded">Đã hoàn tiền</option>
                  </select>
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
                          <div>{item.product?.name || 'Sản phẩm đã bị xóa'}</div>
                          {item.isGift && (
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-0.5">
                              🎁 Sản phẩm này được tặng kèm
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 dark:text-gray-400 font-mono font-medium align-middle">{item.product?.sku || 'N/A'}</td>
                        <td className={`p-3 align-middle font-medium ${item.isGift ? 'text-emerald-600 dark:text-emerald-400 font-bold line-through decoration-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.isGift ? '0đ' : `${item.price.toLocaleString()}đ`}
                        </td>
                        <td className="p-3 text-center font-medium text-gray-800 dark:text-gray-200 align-middle">{item.qty}</td>
                        <td className={`p-3 text-right font-bold align-middle ${item.isGift ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                          {item.isGift ? '0đ' : `${(item.price * item.qty).toLocaleString()}đ`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Return Request Verification */}
            {selectedOrder.returnRequest && selectedOrder.returnRequest.reason && (
              <div className="mt-6 p-4 rounded-xl border border-dashed text-sm bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <h4 className="font-extrabold text-gray-800 dark:text-white mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  🔄 Yêu cầu hoàn trả hàng & Hoàn tiền
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 text-left">
                    <p><span className="font-bold text-gray-500">Lý do từ khách hàng:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{selectedOrder.returnRequest.reason}</span></p>
                    <p><span className="font-bold text-gray-500">Thời gian yêu cầu:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(selectedOrder.returnRequest.createdAt).toLocaleString('vi-VN')}</span></p>
                    
                    {selectedOrder.returnRequest.images?.length > 0 && (
                      <div className="mt-2">
                        <p className="font-bold text-gray-500 mb-1">Ảnh minh chứng:</p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedOrder.returnRequest.images.map((img: string, i: number) => (
                            <a key={i} href={img.startsWith('http') ? img : `${API_BASE}${img}`} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border dark:border-gray-700 hover:opacity-80 transition-opacity flex items-center justify-center bg-gray-105">
                              <img src={img.startsWith('http') ? img : `${API_BASE}${img}`} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <p><span className="font-bold text-gray-500">Trạng thái duyệt:</span> 
                      <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        selectedOrder.returnRequest.status === 'approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                          : selectedOrder.returnRequest.status === 'rejected'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'
                      }`}>
                        {selectedOrder.returnRequest.status === 'approved' ? 'Đã duyệt' : 
                         selectedOrder.returnRequest.status === 'rejected' ? 'Đã từ chối' : 'Chờ duyệt'}
                      </span>
                    </p>
                    
                    {selectedOrder.returnRequest.status === 'pending' ? (
                      <div className="space-y-2 mt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ý kiến phản hồi / Lý do từ chối *</label>
                          <textarea
                            rows={2}
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                            placeholder="Nhập ghi chú phản hồi cho khách hàng..."
                            className="w-full border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:border-primary resize-none"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveReturn(selectedOrder._id)}
                            disabled={isApprovingReturn || isRejectingReturn}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer border-0"
                          >
                            {isApprovingReturn ? 'Đang duyệt...' : 'Đồng ý hoàn'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectReturn(selectedOrder._id)}
                            disabled={isApprovingReturn || isRejectingReturn}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer border-0"
                          >
                            {isRejectingReturn ? 'Đang từ chối...' : 'Từ chối'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      selectedOrder.returnRequest.adminComment && (
                        <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-750">
                          <p className="font-bold text-gray-500 text-[10px] uppercase">Ghi chú từ Admin:</p>
                          <p className="italic text-gray-800 dark:text-gray-300 text-xs mt-0.5">{selectedOrder.returnRequest.adminComment}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

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

      {/* Proof Modal */}
      {isProofModalOpen && proofModalUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">📄 Minh chứng chuyển khoản ngân hàng</h4>
              <button 
                type="button"
                onClick={() => { setIsProofModalOpen(false); setProofModalUrl(null); }}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white font-extrabold cursor-pointer border-0 bg-transparent"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex items-center justify-center bg-gray-100 dark:bg-gray-900 flex-1">
              <img 
                src={proofModalUrl.startsWith('http') ? proofModalUrl : `${API_BASE}${proofModalUrl}`} 
                alt="Minh chứng giao dịch" 
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm cursor-zoom-in"
                onClick={() => window.open(proofModalUrl.startsWith('http') ? proofModalUrl : `${API_BASE}${proofModalUrl}`, '_blank')}
              />
            </div>
            
            <div className="p-4 border-t dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-750">
              <button 
                onClick={() => { setIsProofModalOpen(false); setProofModalUrl(null); }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer"
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
export default Orders;
