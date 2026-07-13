import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, ShoppingCart, DollarSign, Package, TrendingUp, ArrowUpRight, Loader2, Monitor, Globe } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
const API_BASE = 'http://localhost:5000';

const formatMoney = (v: number) => {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v.toLocaleString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
    case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
    case 'shipping': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
    case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-700';
  }
};
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Chờ xác nhận';
    case 'confirmed': return 'Đã xác nhận';
    case 'shipping': return 'Đang giao';
    case 'delivered': return 'Hoàn thành';
    case 'cancelled': return 'Đã huỷ';
    default: return status;
  }
};

const Dashboard = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', period],
    queryFn: async () => {
      const res = await api.get(`/dashboard/stats?period=${period}`);
      return res.data.data;
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const kpis = data?.kpis;
  const revenueChart = data?.revenueChart || [];
  const orderStatusChart = data?.orderStatusChart || [];
  const topProducts = data?.topProducts || [];
  const recentOrders = data?.recentOrders || [];

  const statCards = [
    {
      title: 'Tổng khách hàng',
      value: kpis ? kpis.totalCustomers.toLocaleString() : '—',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      title: 'Tổng đơn hàng',
      value: kpis ? kpis.totalOrders.toLocaleString() : '—',
      icon: ShoppingCart,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-500/10',
    },
    {
      title: 'Doanh thu (đã TT)',
      value: kpis ? kpis.totalRevenue.toLocaleString('vi-VN') + ' ₫' : '—',
      isRevenue: true,
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Sản phẩm đã bán',
      value: kpis ? kpis.totalProductsSold.toLocaleString() : '—',
      icon: Package,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg p-3 text-sm">
          <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
          <p className="text-primary font-semibold">{payload[0].value.toLocaleString()}đ</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tổng quan thống kê</h2>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Dữ liệu thực • Tự động cập nhật mỗi 30 giây
          </p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value as any)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm font-medium dark:text-white outline-none cursor-pointer hover:border-primary transition-colors"
        >
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="year">Năm nay</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center ${stat.color} shrink-0`}>
              <stat.icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{stat.title}</p>
              {isLoading ? (
                <div className="h-7 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse mt-1" />
              ) : (
                <h3 className={`font-bold text-gray-900 dark:text-white leading-tight ${'isRevenue' in stat && stat.isRevenue ? 'text-lg' : 'text-2xl'}`}>{stat.value}</h3>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" /> Biểu đồ doanh thu
          </h3>
          <p className="text-xs text-gray-400 mb-5">Chỉ tính đơn đã thanh toán</p>
          {isLoading ? (
            <div className="h-72 flex items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mr-2" size={20} /> Đang tải dữ liệu...
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={v => formatMoney(v)} width={60} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" dot={false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Order Status Pie */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Trạng thái đơn hàng</h3>
          <p className="text-xs text-gray-400 mb-4">Toàn bộ đơn hàng</p>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
            </div>
          ) : orderStatusChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
          ) : (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={orderStatusChart} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value">
                      {orderStatusChart.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} đơn`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-1">
                {orderStatusChart.map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="text-gray-600 dark:text-gray-300 font-medium">{entry.name}</span>
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row: Top Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Package size={18} className="text-orange-500" /> Top sản phẩm bán chạy
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p: any, idx: number) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4 text-center">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0 border dark:border-gray-700">
                    {p.image ? (
                      <img src={`${API_BASE}${p.image}`} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.totalRevenue.toLocaleString()}đ</p>
                  </div>
                  <span className="text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full shrink-0">
                    {p.totalQty} đã bán
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-green-500" /> Đơn hàng gần đây
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có đơn hàng nào</p>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order: any) => (
                <div key={order._id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 dark:text-white font-mono">{order.orderCode}</span>
                        {order.orderSource === 'pos' ? (
                          <span className="px-1.5 py-0 rounded text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                            <Monitor size={8} /> POS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0 rounded text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-0.5">
                            <Globe size={8} /> Web
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">{order.customer?.name || 'Khách vãng lai'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-bold text-primary">{order.totalAmount.toLocaleString()}đ</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(order.orderStatus)}`}>
                      {getStatusText(order.orderStatus)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
