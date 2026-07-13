import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyService } from '../services/loyaltyService';
import { Plus, Trash2, Save, RefreshCw, Edit2, CheckCircle2, X, Users, ToggleLeft, ToggleRight } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface Tier {
  name: string;
  minPoints: number;
  pointMultiplier: number;
  discountPercent: number;
  color: string;
  icon: string;
  isActive: boolean;
  memberCount?: number;
}

const PRESET_ICONS = ['🥉', '🥈', '🥇', '💎', '👑', '🌟', '🔥', '⚡'];
const PRESET_COLORS = ['#6B7280', '#9CA3AF', '#F59E0B', '#60A5FA', '#A855F7', '#1D4ED8', '#10B981', '#1C1917'];

const defaultTier = (): Tier => ({
  name: '',
  minPoints: 0,
  pointMultiplier: 1,
  discountPercent: 0,
  color: '#6B7280',
  icon: '🥉',
  isActive: true,
});

/* ─── Tier Edit Modal ────────────────────────────────────────── */
const TierModal = ({
  tier, onSave, onClose,
}: { tier: Tier; onSave: (t: Tier) => void; onClose: () => void }) => {
  const [form, setForm] = useState<Tier>({ ...tier });
  const set = (field: keyof Tier, val: any) => setForm(f => ({ ...f, [field]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            {tier.name ? `Chỉnh sửa: ${tier.name}` : 'Thêm hạng thành viên'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Icon + Name row */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Icon</label>
              <select
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                className="w-16 h-10 text-center text-2xl border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 outline-none cursor-pointer"
              >
                {PRESET_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên hạng <span className="text-red-400">*</span></label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="vd: Thành viên Vàng"
                className="h-10 px-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold dark:bg-gray-700 dark:text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
              />
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Màu hạng</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full transition-all hover:scale-110 shadow-sm"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => set('color', e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border border-gray-200"
                title="Tuỳ chỉnh"
              />
              <span
                className="ml-2 px-3 py-1 rounded-full text-xs font-bold border-2"
                style={{ borderColor: form.color, color: form.color, backgroundColor: form.color + '15' }}
              >
                {form.icon} {form.name || 'Preview'}
              </span>
            </div>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Điểm cần đạt</label>
              <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input
                  type="number"
                  min={0}
                  value={form.minPoints}
                  onChange={e => set('minPoints', parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2.5 text-sm font-semibold bg-transparent dark:text-white outline-none"
                />
                <span className="px-3 text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-700 h-full flex items-center border-l border-gray-200 dark:border-gray-600">điểm</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Giảm giá đơn hàng</label>
              <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.discountPercent}
                  onChange={e => set('discountPercent', parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2.5 text-sm font-semibold bg-transparent dark:text-white outline-none"
                />
                <span className="px-3 text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-700 h-full flex items-center border-l border-gray-200 dark:border-gray-600">%</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hệ số điểm tích</label>
              <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input
                  type="number"
                  min={1}
                  step={0.1}
                  value={form.pointMultiplier}
                  onChange={e => set('pointMultiplier', parseFloat(e.target.value) || 1)}
                  className="flex-1 px-3 py-2.5 text-sm font-semibold bg-transparent dark:text-white outline-none"
                />
                <span className="px-3 text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-700 h-full flex items-center border-l border-gray-200 dark:border-gray-600">lần</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</label>
              <button
                onClick={() => set('isActive', !form.isActive)}
                className={`h-10 px-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 ${form.isActive ? 'border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 text-gray-400 bg-gray-50 dark:bg-gray-700'}`}
              >
                {form.isActive ? <><CheckCircle2 size={15} /> Hoạt động</> : <><X size={15} /> Tắt</>}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
            Huỷ
          </button>
          <button
            onClick={() => { if (form.name) { onSave(form); onClose(); } }}
            disabled={!form.name}
            className="px-5 py-2.5 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-md disabled:opacity-40"
          >
            Lưu hạng
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────── */
const LoyaltySettings = () => {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: loyaltyService.getConfig,
  });

  // Earning rule state
  const [vndToEarn, setVndToEarn] = useState(100000);
  const [applyToOrders, setApplyToOrders] = useState<'all' | 'pos' | 'website'>('all');
  const [delayDays, setDelayDays] = useState(0);
  // Spending rule state
  const [minOrderToUse, setMinOrderToUse] = useState(0);
  const [maxUsagePercent, setMaxUsagePercent] = useState(1);
  const [vndPerRedemption, setVndPerRedemption] = useState(1000);
  // Global
  const [isActive, setIsActive] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);

  // Modal state
  const [editingTier, setEditingTier] = useState<{ tier: Tier; idx: number } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (data?.data) {
      const cfg = data.data;
      setVndToEarn(cfg.vndToEarnOnePoint ?? 100000);
      setApplyToOrders(cfg.applyToOrders ?? 'all');
      setDelayDays(cfg.delayDaysAfterPayment ?? 0);
      setMinOrderToUse(cfg.minOrderToUsePoints ?? 0);
      setMaxUsagePercent(cfg.maxPointUsagePercent ?? 1);
      setVndPerRedemption(cfg.vndPerPointRedemption ?? 1000);
      setIsActive(cfg.isActive ?? true);
      setTiers(cfg.tiers ?? []);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => loyaltyService.updateConfig({
      vndToEarnOnePoint: vndToEarn,
      applyToOrders,
      delayDaysAfterPayment: delayDays,
      minOrderToUsePoints: minOrderToUse,
      maxPointUsagePercent: maxUsagePercent,
      vndPerPointRedemption: vndPerRedemption,
      isActive,
      tiers,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    },
  });

  const recalcMutation = useMutation({
    mutationFn: loyaltyService.recalculateAllTiers,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const [backfillResult, setBackfillResult] = useState<{
    processed: number;
    skipped: number;
    totalPointsAwarded: number;
    details: Array<{
      orderCode: string;
      customerName: string;
      orderAmount: number;
      pointsAwarded: number;
      newTier: string;
    }>;
  } | null>(null);

  const backfillMutation = useMutation({
    mutationFn: loyaltyService.backfillPoints,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setBackfillResult(res.summary ? { ...res.summary, details: res.details } : null);
    },
  });

  const openAdd = () => {
    setEditingTier({ tier: defaultTier(), idx: -1 });
    setShowModal(true);
  };
  const openEdit = (tier: Tier, idx: number) => {
    setEditingTier({ tier, idx });
    setShowModal(true);
  };
  const handleSaveTier = (saved: Tier) => {
    if (!editingTier) return;
    if (editingTier.idx === -1) {
      setTiers(prev => [...prev, saved]);
    } else {
      setTiers(prev => prev.map((t, i) => i === editingTier.idx ? saved : t));
    }
  };
  const removeTier = (idx: number) => setTiers(prev => prev.filter((_, i) => i !== idx));
  const toggleTierActive = (idx: number) =>
    setTiers(prev => prev.map((t, i) => i === idx ? { ...t, isActive: !t.isActive } : t));

  const sortedTiers = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  const totalMembers = tiers.reduce((s, t) => s + (t.memberCount || 0), 0);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
      <RefreshCw className="animate-spin" size={20} />
      <span className="text-sm">Đang tải cấu hình...</span>
    </div>
  );

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold dark:bg-gray-700 dark:text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all bg-white";
  const labelCls = "block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5";
  const sectionCls = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden";
  const sectionHeadCls = "px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cấu hình Loyalty</h2>
          <p className="text-sm text-gray-400 mt-0.5">Thiết lập quy tắc tích điểm và hạng thành viên</p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasPermission('loyalty', 'update') && (
            <>
              <button
                onClick={() => setIsActive(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${isActive ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-300 bg-gray-50 dark:bg-gray-700 text-gray-500'}`}
              >
                {isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {isActive ? 'Đang hoạt động' : 'Đã tắt'}
              </button>
              <button
                onClick={() => recalcMutation.mutate()}
                disabled={recalcMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={15} className={recalcMutation.isPending ? 'animate-spin' : ''} />
                Tính lại hạng
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${savedOk ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'} cursor-pointer`}
              >
                {savedOk ? <><CheckCircle2 size={16} /> Đã lưu</> : <><Save size={15} />{saveMutation.isPending ? 'Đang lưu...' : 'Xác nhận'}</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Section 1: Earning rules ── */}
      <div className={sectionCls}>
        <div className={sectionHeadCls}>
          <h3 className="font-bold text-gray-800 dark:text-white text-sm">
            Ưu đãi khi khách hàng phát sinh đơn hàng và đã thanh toán
          </h3>
        </div>
        <div className="p-6 space-y-5">
          {/* Apply to orders */}
          <div>
            <label className={labelCls}>Cộng điểm đối với đơn hàng phát sinh từ</label>
            <select
              value={applyToOrders}
              onChange={e => setApplyToOrders(e.target.value as any)}
              className={inputCls}
            >
              <option value="all">Tất cả đơn hàng</option>
              <option value="pos">Chỉ đơn từ Mini POS</option>
              <option value="website">Chỉ đơn từ Website</option>
            </select>
          </div>

          {/* VND → points + delay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Tỷ lệ quy đổi tiền thành điểm
                <span className="text-gray-400 font-normal ml-1">(VD: nhập 10.000 thì thanh toán 10.000đ nhận 1 điểm)</span>
              </label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={vndToEarn}
                  onChange={e => setVndToEarn(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 text-sm font-semibold bg-white dark:bg-gray-700 dark:text-white outline-none"
                />
                <span className="px-4 bg-gray-50 dark:bg-gray-700/50 border-l border-gray-200 dark:border-gray-600 flex items-center text-sm font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  VNĐ được 1 điểm
                </span>
              </div>
              {vndToEarn > 0 && (
                <p className="mt-1.5 text-xs text-indigo-500 dark:text-indigo-400">
                  💡 Đơn <b>1.000.000đ</b> → <b>{Math.floor(1000000 / vndToEarn)} điểm</b>
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Điểm sẽ được cộng khi đơn hàng được thanh toán và thành công sau:</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input
                  type="number"
                  min={0}
                  value={delayDays}
                  onChange={e => setDelayDays(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 text-sm font-semibold bg-white dark:bg-gray-700 dark:text-white outline-none"
                />
                <span className="px-4 bg-gray-50 dark:bg-gray-700/50 border-l border-gray-200 dark:border-gray-600 flex items-center text-sm font-bold text-gray-600 dark:text-gray-300">
                  Ngày
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section: Retroactive Backfill ── */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800/60 dark:to-gray-800/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 p-6 space-y-4">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <RefreshCw size={22} className={backfillMutation.isPending ? 'animate-spin' : ''} />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Tính điểm hồi tố cho các đơn hàng cũ</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Hệ thống sẽ quét toàn bộ đơn hàng <b>đã thanh toán</b> từ trước đến nay chưa được cộng điểm để tiến hành tính toán và cộng điểm ngay cho khách hàng theo đúng quy tắc đang thiết lập.
            </p>
          </div>
          {hasPermission('loyalty', 'update') && (
            <button
              onClick={() => { if (window.confirm("Bắt đầu quét và cộng điểm cho tất cả đơn hàng đã thanh toán chưa được tích điểm?")) backfillMutation.mutate(); }}
              disabled={backfillMutation.isPending}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              {backfillMutation.isPending ? 'Đang xử lý...' : 'Quét và cộng điểm ngay'}
            </button>
          )}
        </div>

        {backfillResult && (
          <div className="mt-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-indigo-100 dark:border-gray-700 space-y-3">
            <h5 className="font-bold text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> Quét hoàn tất! Đã xử lý {backfillResult.processed} đơn hàng, tích {backfillResult.totalPointsAwarded} điểm.
            </h5>
            {backfillResult.details && backfillResult.details.length > 0 ? (
              <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-50 dark:divide-gray-700/50">
                {backfillResult.details.map((d, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between text-xs font-semibold flex-wrap gap-2">
                    <span className="text-gray-500">Mã đơn: <b className="text-gray-700 dark:text-gray-300">{d.orderCode}</b></span>
                    <span className="text-gray-600 dark:text-gray-400">Khách hàng: <b className="text-gray-800 dark:text-white">{d.customerName}</b></span>
                    <span className="text-gray-500">Đơn hàng: <b>{d.orderAmount.toLocaleString()}đ</b></span>
                    <span className="text-indigo-600 dark:text-indigo-400">+{d.pointsAwarded} điểm</span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">Hạng {d.newTier}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Không có đơn hàng mới nào cần cộng điểm.</p>
            )}
          </div>
        )}
      </div>



      {/* ── Section 3: Tier table ── */}
      <div className={sectionCls}>
        <div className={`${sectionHeadCls} flex items-center justify-between`}>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Danh sách hạng bậc</h3>
            <p className="text-xs text-gray-400 mt-0.5">Tổng {totalMembers} thành viên đã được phân hạng</p>
          </div>
          {hasPermission('loyalty', 'update') && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus size={16} /> Thêm hạng
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">
                <th className="px-4 py-3 border-b dark:border-gray-700 w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Thẻ thành viên</th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Hạng bậc</th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Điểm cần đạt</th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Giảm giá khi mua hàng (%)</th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Hệ số điểm</th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Số lượng thành viên</th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Trạng thái</th>
                <th className="px-4 py-3 border-b dark:border-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {tiers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                    <div className="text-4xl mb-2">🏅</div>
                    Chưa có hạng thành viên nào. Nhấn <b>Thêm hạng</b> để bắt đầu.
                  </td>
                </tr>
              )}
              {sortedTiers.map((tier, idx) => {
                const realIdx = tiers.findIndex(t => t === tier);
                const isDefault = tier.minPoints === 0;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <input type="checkbox" className="rounded" />
                    </td>
                    {/* Badge card */}
                    <td className="px-4 py-3.5">
                      <div
                        className="w-12 h-8 rounded-lg flex items-center justify-center text-xl shadow-sm"
                        style={{ backgroundColor: tier.color + '25', border: `2px solid ${tier.color}60` }}
                      >
                        {tier.icon}
                      </div>
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-sm" style={{ color: tier.color }}>
                        {tier.name || '—'}
                      </span>
                    </td>
                    {/* Min points */}
                    <td className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300 font-semibold">
                      {tier.minPoints === 0
                        ? <span className="text-gray-400">0</span>
                        : tier.minPoints.toLocaleString()}
                    </td>
                    {/* Discount */}
                    <td className="px-4 py-3.5">
                      <span className={`text-sm font-bold ${tier.discountPercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        {tier.discountPercent}
                      </span>
                    </td>
                    {/* Multiplier */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        x{tier.pointMultiplier}
                      </span>
                    </td>
                    {/* Member count */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <Users size={13} className="text-gray-400" />
                        {tier.memberCount !== undefined
                          ? (tier.memberCount > 0 ? tier.memberCount : <span className="text-gray-300 dark:text-gray-600">0</span>)
                          : <span className="text-gray-300">-</span>}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => hasPermission('loyalty', 'update') && toggleTierActive(realIdx)}
                        disabled={!hasPermission('loyalty', 'update')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all ${tier.isActive ? 'border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : 'border-gray-300 text-gray-400 bg-gray-100 dark:bg-gray-700'} ${!hasPermission('loyalty', 'update') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {tier.isActive ? 'Đang hoạt động' : 'Đã tắt'}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                         {!isDefault && hasPermission('loyalty', 'update') && (
                          <>
                            <button
                              onClick={() => openEdit(tier, realIdx)}
                              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => { if (window.confirm(`Xoá hạng "${tier.name}"?`)) removeTier(realIdx); }}
                              className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {isDefault && (
                          <button
                            onClick={() => openEdit(tier, realIdx)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          >
                            Chỉnh sửa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tier Edit Modal */}
      {showModal && editingTier && (
        <TierModal
          tier={editingTier.tier}
          onSave={handleSaveTier}
          onClose={() => { setShowModal(false); setEditingTier(null); }}
        />
      )}
    </div>
  );
};

export default LoyaltySettings;
