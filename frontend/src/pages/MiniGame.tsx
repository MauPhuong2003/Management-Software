import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { miniGameService } from '../services/miniGameService';
import { promotionService } from '../services/promotionService';
import { useAuthStore } from '../store/authStore';
import {
  Gift,
  Ticket,
  Frown,
  History,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Upload,
  ImageIcon,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Save,
  Eye,
  X,
  Edit2
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

interface GiftItem {
  _id?: string;
  name: string;
  image: string;
  quantity: number;
  quantityRemaining: number;
  claimedCount: number;
  prizeType: 'normal' | 'no_prize';
  receiveMethod: 'direct' | 'online';
  expiryDays?: number;
  voucherId?: any; // populated object or string ID
}

interface WheelSlotInput {
  _id?: string;
  giftId: string;
  color: string;
  probability: number;
}

interface MiniGameData {
  name: string;
  isActive: boolean;
  bannerDesktop: string;
  bannerMobile: string;
  wheelSize: number;
  slotsCount: number;
  slots: WheelSlotInput[];
  pointsPerSpin: number;
  maxSpinsPerDay: number;
  startDate?: string;
  endDate?: string;
  description?: string;
  spinDuration?: number;
  borderColor?: string;
  evenSlotColor?: string;
  oddSlotColor?: string;
  pointerColor?: string;
}

const DEFAULT_MINIGAME: MiniGameData = {
  name: 'Vòng Quay May Mắn',
  isActive: false,
  bannerDesktop: '',
  bannerMobile: '',
  wheelSize: 400,
  slotsCount: 6,
  slots: [],
  pointsPerSpin: 100,
  maxSpinsPerDay: 3,
  description: '',
  spinDuration: 10,
  borderColor: '#3B82F6',
  evenSlotColor: '#F7AE14',
  oddSlotColor: '#5079F5',
  pointerColor: '#EC4899'
};

const PRIZE_TYPE_LABELS = {
  normal: 'Bình thường',
  no_prize: 'Chúc may mắn'
};

const PRIZE_TYPE_COLORS = {
  normal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  no_prize: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
};

const REWARD_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  contacted: 'Đã liên hệ',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ'
};

const REWARD_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/30',
  contacted: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30',
  delivered: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30',
  cancelled: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30'
};

function darkenColor(hex: string, percent: number): string {
  try {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$2');
    let r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);
    r = Math.max(0, Math.min(255, r - Math.floor(255 * (percent / 100))));
    g = Math.max(0, Math.min(255, g - Math.floor(255 * (percent / 100))));
    b = Math.max(0, Math.min(255, b - Math.floor(255 * (percent / 100))));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  } catch {
    return hex;
  }
}

export default function MiniGame() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'config' | 'gifts' | 'history'>('config');
  const [formData, setFormData] = useState<MiniGameData>(DEFAULT_MINIGAME);

  const handleFormChange = (key: keyof MiniGameData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Modal gift creation states
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);

  // Spin History States
  const [historyPage, setHistoryPage] = useState(1);
  const [filterPrizeType, setFilterPrizeType] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  // Queries
  const { data: minigameRes, isLoading: isGameLoading } = useQuery({
    queryKey: ['admin-minigame'],
    queryFn: miniGameService.getMiniGame
  });

  const { data: giftsRes, isLoading: isGiftsLoading } = useQuery({
    queryKey: ['admin-gifts'],
    queryFn: () => miniGameService.getGifts({ limit: 100 })
  });

  const { data: promotionsRes } = useQuery({
    queryKey: ['admin-promotions-list'],
    queryFn: () => promotionService.getPromotions()
  });

  const { data: historyRes, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['admin-spin-history', historyPage, filterPrizeType],
    queryFn: () => miniGameService.getSpinHistory({ page: historyPage, limit: 15, prizeType: filterPrizeType || undefined }),
    enabled: activeTab === 'history'
  });

  // Sync minigame loaded data
  useEffect(() => {
    if (minigameRes?.data) {
      const d = minigameRes.data;
      setFormData({
        name: d.name || DEFAULT_MINIGAME.name,
        isActive: d.isActive ?? DEFAULT_MINIGAME.isActive,
        bannerDesktop: d.bannerDesktop || '',
        bannerMobile: d.bannerMobile || '',
        wheelSize: d.wheelSize || DEFAULT_MINIGAME.wheelSize,
        slotsCount: d.slotsCount || DEFAULT_MINIGAME.slotsCount,
        slots: d.slots?.map((s: any) => ({
          giftId: s.giftId?._id || s.giftId,
          color: s.color || '#6366f1',
          probability: s.probability || 0
        })) || [],
        pointsPerSpin: d.pointsPerSpin ?? DEFAULT_MINIGAME.pointsPerSpin,
        maxSpinsPerDay: d.maxSpinsPerDay ?? DEFAULT_MINIGAME.maxSpinsPerDay,
        startDate: d.startDate ? new Date(d.startDate).toISOString().slice(0, 10) : '',
        endDate: d.endDate ? new Date(d.endDate).toISOString().slice(0, 10) : '',
        description: d.description ?? DEFAULT_MINIGAME.description,
        spinDuration: d.spinDuration ?? DEFAULT_MINIGAME.spinDuration,
        borderColor: d.borderColor ?? DEFAULT_MINIGAME.borderColor,
        evenSlotColor: d.evenSlotColor ?? DEFAULT_MINIGAME.evenSlotColor,
        oddSlotColor: d.oddSlotColor ?? DEFAULT_MINIGAME.oddSlotColor,
        pointerColor: d.pointerColor ?? DEFAULT_MINIGAME.pointerColor
      });
    }
  }, [minigameRes]);

  // Mutations for MiniGame configs
  const saveMinigameMutation = useMutation({
    mutationFn: miniGameService.upsertMiniGame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-minigame'] });
      alert('✅ Đã lưu cấu hình MiniGame thành công!');
    },
    onError: (err: any) => {
      alert('❌ Lỗi: ' + (err.response?.data?.message || err.message));
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: miniGameService.toggleMiniGame,
    onSuccess: (res) => {
      setFormData(prev => ({ ...prev, isActive: res.data.isActive }));
      queryClient.invalidateQueries({ queryKey: ['admin-minigame'] });
    }
  });

  // Mutations for Gifts CRUD
  const saveGiftMutation = useMutation({
    mutationFn: (payload: GiftItem) => {
      if (payload._id) {
        return miniGameService.updateGift(payload._id, payload);
      }
      return miniGameService.createGift(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-minigame'] });
      setIsGiftModalOpen(false);
      setEditingGift(null);
      alert('✅ Đã lưu quà tặng thành công!');
    },
    onError: (err: any) => {
      alert('❌ Lỗi: ' + (err.response?.data?.message || err.message));
    }
  });

  const deleteGiftMutation = useMutation({
    mutationFn: miniGameService.deleteGift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gifts'] });
      alert('✅ Đã xóa quà tặng khỏi kho thành công!');
    },
    onError: (err: any) => {
      alert('❌ Lỗi: ' + (err.response?.data?.message || err.message));
    }
  });

  // Mutation for Spin History Reward Update
  const updateRewardMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => 
      miniGameService.updateRewardStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-spin-history'] });
    }
  });

  const giftsList: GiftItem[] = giftsRes?.data || [];
  const promotionsList: any[] = promotionsRes?.data || [];
  const historyList = historyRes?.data || [];
  const historyStats = historyRes?.stats || { totalSpins: 0, totalPrizes: 0, noPrizeCount: 0 };
  const historyPagination = historyRes?.pagination || { page: 1, totalPages: 1 };

  // Computed total probabilities
  const totalProbability = formData.slots.reduce((sum, s) => sum + (Number(s.probability) || 0), 0);
  const isProbabilityValid = totalProbability === 100;

  // Banner file upload handlers
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/api/admin/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: uploadData
      });
      const result = await res.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          [type === 'desktop' ? 'bannerDesktop' : 'bannerMobile']: result.data.url
        }));
      } else {
        alert(result.message || 'Lỗi tải ảnh');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi upload ảnh banner.');
    }
  };

  // Add/Remove slot references in minigame config
  const handleAddGiftToSlots = (gift: GiftItem) => {
    if (formData.slots.length >= formData.slotsCount) {
      alert(`Đã đạt giới hạn ${formData.slotsCount} ô. Hãy điều chỉnh "Số lượng ô" hoặc xóa bớt ô để thêm.`);
      return;
    }
    // Check if gift already in slots
    if (formData.slots.some(s => s.giftId === gift._id)) {
      alert('Quà tặng này đã được thêm vào ô quay rồi.');
      return;
    }

    const nextColor = formData.slots.length % 2 === 0 
      ? (formData.evenSlotColor || '#F7AE14') 
      : (formData.oddSlotColor || '#5079F5');

    setFormData(prev => ({
      ...prev,
      slots: [...prev.slots, {
        giftId: gift._id!,
        color: nextColor,
        probability: 0
      }]
    }));
  };

  const handleRemoveSlot = (giftId: string) => {
    setFormData(prev => ({
      ...prev,
      slots: prev.slots.filter(s => s.giftId !== giftId)
    }));
  };

  const handleUpdateSlotProbability = (giftId: string, prob: number) => {
    setFormData(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.giftId === giftId ? { ...s, probability: Math.max(0, prob) } : s)
    }));
  };

  const handleUpdateSlotColor = (giftId: string, color: string) => {
    setFormData(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.giftId === giftId ? { ...s, color } : s)
    }));
  };

  const handleEvenColorChange = (newColor: string) => {
    setFormData(prev => {
      const updatedSlots = prev.slots.map((s, idx) => 
        idx % 2 === 0 ? { ...s, color: newColor } : s
      );
      return { ...prev, evenSlotColor: newColor, slots: updatedSlots };
    });
  };

  const handleOddColorChange = (newColor: string) => {
    setFormData(prev => {
      const updatedSlots = prev.slots.map((s, idx) => 
        idx % 2 !== 0 ? { ...s, color: newColor } : s
      );
      return { ...prev, oddSlotColor: newColor, slots: updatedSlots };
    });
  };

  const handleSlotsCountChange = (newCount: number) => {
    setFormData(prev => {
      let updatedSlots = [...prev.slots];
      if (updatedSlots.length > newCount) {
        updatedSlots = updatedSlots.slice(0, newCount);
      }
      return {
        ...prev,
        slotsCount: newCount,
        slots: updatedSlots
      };
    });
  };

  const handleSaveMinigame = () => {
    if (formData.slots.length === 0) {
      alert('Vui lòng thêm ít nhất một quà tặng vào ô quay!');
      return;
    }
    if (formData.slots.length !== formData.slotsCount) {
      alert(`Vui lòng chọn đúng ${formData.slotsCount} quà tặng tương ứng với số lượng ô thiết lập (hiện tại mới chọn ${formData.slots.length} ô).`);
      return;
    }
    if (!isProbabilityValid) {
      alert(`Tổng tỷ lệ phải bằng 100%. Hiện tại là ${totalProbability}%. Vui lòng điều chỉnh lại.`);
      return;
    }
    saveMinigameMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-md flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-xl font-black flex items-center gap-2">🎡 Thiết Lập Vòng Quay May Mắn</h1>
          <p className="text-xs opacity-90">Quản lý sự kiện, danh mục quà tặng, tỷ lệ trúng và xem lịch sử khách hàng nhận thưởng</p>
        </div>
        <div className="flex gap-2">
          {(['config', 'gifts', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab 
                  ? 'bg-white text-indigo-650 shadow-sm' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {tab === 'config' ? '⚙️ Vòng Quay' : tab === 'gifts' ? '🎁 Kho Quà Tặng' : '📜 Lịch Sử Lượt Quay'}
            </button>
          ))}
        </div>
      </div>

      {isGameLoading || isGiftsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="animate-spin text-primary" size={32} />
          <p className="text-sm font-semibold text-gray-500">Đang tải cấu hình...</p>
        </div>
      ) : (
        <>
          {/* Tab 1: Cấu hình Vòng Quay */}
          {activeTab === 'config' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Config Forms */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. General Config Card */}
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">
                    🛠️ Thiết lập thông số chung
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">* Tên minigame</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                        placeholder="Game Vòng quay"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">* Trạng thái</label>
                      <select 
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={(e) => handleFormChange('isActive', e.target.value === 'true')}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                      >
                        <option value="true">Đang hoạt động</option>
                        <option value="false">Ngưng hoạt động</option>
                      </select>
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Mô tả</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        placeholder="Nhập mô tả cho minigame"
                        rows={3}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">* Thời gian quay (giây)</label>
                      <input 
                        type="number" 
                        value={formData.spinDuration ?? 10}
                        onChange={(e) => handleFormChange('spinDuration', Number(e.target.value) || 10)}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">* Số lượng ô</label>
                      <select 
                        value={formData.slotsCount}
                        onChange={(e) => handleSlotsCountChange(Number(e.target.value))}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                      >
                        <option value={4}>4</option>
                        <option value={6}>6</option>
                        <option value={8}>8</option>
                        <option value={10}>10</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Màu viền</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={formData.borderColor || '#3B82F6'}
                          onChange={(e) => handleFormChange('borderColor', e.target.value)}
                          className="w-10 h-10 p-0 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden shrink-0"
                        />
                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{formData.borderColor?.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Màu ô chẵn</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={formData.evenSlotColor || '#F7AE14'}
                          onChange={(e) => handleEvenColorChange(e.target.value)}
                          className="w-10 h-10 p-0 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden shrink-0"
                        />
                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{formData.evenSlotColor?.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Màu ô lẻ</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={formData.oddSlotColor || '#5079F5'}
                          onChange={(e) => handleOddColorChange(e.target.value)}
                          className="w-10 h-10 p-0 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden shrink-0"
                        />
                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{formData.oddSlotColor?.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Màu con trỏ</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={formData.pointerColor || '#EC4899'}
                          onChange={(e) => handleFormChange('pointerColor', e.target.value)}
                          className="w-10 h-10 p-0 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden shrink-0"
                        />
                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{formData.pointerColor?.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Điểm đổi 1 lượt quay</label>
                      <input 
                        type="number" 
                        value={formData.pointsPerSpin}
                        onChange={(e) => handleFormChange('pointsPerSpin', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Giới hạn quay / Ngày / User</label>
                      <input 
                        type="number" 
                        value={formData.maxSpinsPerDay}
                        onChange={(e) => handleFormChange('maxSpinsPerDay', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                        placeholder="0 = Không giới hạn"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Đường kính vòng quay (px)</label>
                      <input 
                        type="number" 
                        value={formData.wheelSize}
                        onChange={(e) => handleFormChange('wheelSize', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Banner Responsive Uploader Card */}
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">
                    🖼️ Hình ảnh Banner làm nền
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Desktop Banner */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Banner Desktop (Tỷ lệ nằm ngang)</span>
                      <div className="border-2 border-dashed dark:border-gray-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 h-44 relative bg-gray-50/50 dark:bg-gray-900/10 overflow-hidden">
                        {formData.bannerDesktop ? (
                          <>
                            <img src={formData.bannerDesktop.startsWith('http') ? formData.bannerDesktop : `${API_BASE}${formData.bannerDesktop}`} alt="Desktop Banner" className="w-full h-full object-cover absolute inset-0" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <label className="px-4 py-2 bg-white text-gray-800 font-bold text-xs rounded-xl cursor-pointer">
                                Thay đổi ảnh
                                <input type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, 'desktop')} className="hidden" />
                              </label>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="text-gray-300" size={28} />
                            <p className="text-[11px] text-gray-400 font-semibold">Khung hình 16:9 hoặc ảnh ngang</p>
                            <label className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-primary dark:text-indigo-400 font-bold text-xs rounded-xl cursor-pointer hover:opacity-90">
                              Chọn ảnh
                              <input type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, 'desktop')} className="hidden" />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile Banner */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Banner Mobile (Tỷ lệ dọc điện thoại)</span>
                      <div className="border-2 border-dashed dark:border-gray-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 h-44 relative bg-gray-50/50 dark:bg-gray-900/10 overflow-hidden">
                        {formData.bannerMobile ? (
                          <>
                            <img src={formData.bannerMobile.startsWith('http') ? formData.bannerMobile : `${API_BASE}${formData.bannerMobile}`} alt="Mobile Banner" className="w-full h-full object-cover absolute inset-0" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <label className="px-4 py-2 bg-white text-gray-800 font-bold text-xs rounded-xl cursor-pointer">
                                Thay đổi ảnh
                                <input type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, 'mobile')} className="hidden" />
                              </label>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="text-gray-300" size={28} />
                            <p className="text-[11px] text-gray-400 font-semibold">Tỷ lệ 9:16 hoặc ảnh dọc</p>
                            <label className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-primary dark:text-indigo-400 font-bold text-xs rounded-xl cursor-pointer hover:opacity-90">
                              Chọn ảnh
                              <input type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, 'mobile')} className="hidden" />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Setup Slots from Gift pool Card */}
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">🎁 Gán quà tặng vào các ô quay</h3>
                      <p className="text-[10px] text-gray-450 mt-0.5">Chọn các quà tặng bên dưới gán vào vòng quay. Tổng tỷ lệ trúng thưởng của các ô phải bằng 100%.</p>
                    </div>
                  </div>

                  {/* Gift Tag Selector */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Quà tặng hiện có trong kho:</span>
                    <div className="flex flex-wrap gap-2">
                      {giftsList.length === 0 ? (
                        <div className="text-xs text-gray-450 italic p-1">Kho quà rỗng. Hãy vào tab "Kho quà tặng" để tạo phần quà!</div>
                      ) : (
                        giftsList.map(gift => {
                          const isAlreadyAdded = formData.slots.some(s => s.giftId === gift._id);
                          return (
                            <button
                              key={gift._id}
                              disabled={isAlreadyAdded}
                              onClick={() => handleAddGiftToSlots(gift)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isAlreadyAdded 
                                  ? 'bg-gray-50 text-gray-400 border-gray-150' 
                                  : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-150 text-indigo-750'
                              }`}
                            >
                              + {gift.name} (SL: {gift.quantity === -1 ? '∞' : gift.quantity})
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Target Slots List Table */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                        Danh sách quà tặng đã chọn ({formData.slots.length} / {formData.slotsCount})
                      </span>
                      
                      {/* Probability allocating helper */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Tổng tỷ lệ:</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                          isProbabilityValid 
                            ? 'bg-emerald-50 text-emerald-705 border-emerald-150' 
                            : 'bg-red-50 text-red-650 border-red-150'
                        }`}>
                          {totalProbability}% / 100%
                        </span>
                      </div>
                    </div>

                    {formData.slots.length === 0 ? (
                      <div className="border border-dashed dark:border-gray-700 py-12 rounded-2xl text-center text-xs text-gray-450 font-bold">
                        Vui lòng nhấp vào các phần quà trong kho ở trên để gán vào vòng quay
                      </div>
                    ) : (
                      <div className="overflow-x-auto border dark:border-gray-700 rounded-2xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 text-gray-550 font-bold border-b dark:border-gray-700">
                              <th className="p-3">Hình ảnh</th>
                              <th className="p-3">Tên quà tặng</th>
                              <th className="p-3">Số lượng kho</th>
                              <th className="p-3">Màu ô</th>
                              <th className="p-3 w-28">Tỷ lệ (%)</th>
                              <th className="p-3 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-700">
                            {formData.slots.map((slot, index) => {
                              const gift = giftsList.find(g => g._id === slot.giftId);
                              if (!gift) return null;

                              return (
                                <tr key={slot.giftId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                  <td className="p-3">
                                    <div className="w-9 h-9 rounded-lg overflow-hidden border dark:border-gray-700 bg-gray-50">
                                      {gift.image ? (
                                        <img src={gift.image.startsWith('http') ? gift.image : `${API_BASE}${gift.image}`} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-extrabold text-sm">🎁</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 font-bold text-gray-800 dark:text-white">
                                    {gift.name}
                                  </td>
                                  <td className="p-3 text-gray-500 font-semibold">
                                    {gift.quantityRemaining} / {gift.quantity === -1 ? '∞' : gift.quantity}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                      <input 
                                        type="color" 
                                        value={slot.color}
                                        onChange={(e) => handleUpdateSlotColor(slot.giftId, e.target.value)}
                                        className="w-7 h-7 p-0 rounded-md border border-gray-200 cursor-pointer overflow-hidden"
                                      />
                                      <span className="font-mono text-[10px] text-gray-400 font-semibold">{slot.color.toUpperCase()}</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="relative flex items-center">
                                      <input 
                                        type="number" 
                                        min="0"
                                        max="100"
                                        value={slot.probability}
                                        onChange={(e) => handleUpdateSlotProbability(slot.giftId, Number(e.target.value) || 0)}
                                        className="w-20 px-2 py-1.5 border dark:border-gray-700 rounded-xl bg-transparent font-bold text-xs text-gray-800 dark:text-white outline-none focus:border-primary"
                                      />
                                      <span className="absolute right-3.5 text-[10px] text-gray-450 font-bold">%</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleRemoveSlot(slot.giftId)}
                                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer border-0 bg-transparent"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div className="pt-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button
                      onClick={handleSaveMinigame}
                      disabled={saveMinigameMutation.isPending || !isProbabilityValid}
                      className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold border-0 shadow-md cursor-pointer hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {saveMinigameMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Xác nhận lưu thiết lập
                    </button>
                  </div>

                </div>
              </div>

              {/* Right Column: Visual Mockup Phone Preview */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 shadow-sm text-center">
                  <h3 className="font-extrabold text-sm text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2 mb-4">
                    📱 Preview trên điện thoại
                  </h3>
                  
                  {/* Phone container */}
                  <div className="mx-auto w-[280px] h-[540px] rounded-[36px] border-8 border-gray-800 dark:border-gray-900 bg-indigo-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center p-3 select-none">
                    {/* Background Banner */}
                    {formData.bannerMobile ? (
                      <img src={formData.bannerMobile.startsWith('http') ? formData.bannerMobile : `${API_BASE}${formData.bannerMobile}`} className="w-full h-full object-cover absolute inset-0 opacity-40" alt="" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-purple-950" />
                    )}
                    
                    {/* Top Notch screen */}
                    <div className="absolute top-2 w-28 h-4 bg-gray-800 rounded-full z-20" />

                    {/* Style injection block for premium animations */}
                    <style>{`
                      @keyframes neon-glow {
                        0%, 100% { box-shadow: 0 0 12px rgba(99, 102, 241, 0.25), 0 0 25px rgba(99, 102, 241, 0.1); }
                        50% { box-shadow: 0 0 24px rgba(99, 102, 241, 0.6), 0 0 45px rgba(99, 102, 241, 0.3); }
                      }
                      @keyframes bulb-blink-even {
                        0%, 100% { background-color: #ffffff; box-shadow: 0 0 10px #fef08a, 0 0 20px #facc15; }
                        50% { background-color: #d1d5db; box-shadow: 0 0 2px rgba(0,0,0,0.1); }
                      }
                      @keyframes bulb-blink-odd {
                        0%, 100% { background-color: #d1d5db; box-shadow: 0 0 2px rgba(0,0,0,0.1); }
                        50% { background-color: #ffffff; box-shadow: 0 0 10px #fef08a, 0 0 20px #facc15; }
                      }
                      .animate-neon-glow {
                        animation: neon-glow 3s infinite;
                      }
                      .bulb-even-active {
                        animation: bulb-blink-even 0.35s infinite alternate;
                      }
                      .bulb-odd-active {
                        animation: bulb-blink-odd 0.35s infinite alternate;
                      }
                    `}</style>

                    {/* Outer border ring with white circular bulbs */}
                    <div 
                      className="relative z-10 w-52 h-52 rounded-full flex items-center justify-center p-3 shrink-0 animate-neon-glow"
                      style={{ backgroundColor: formData.borderColor || '#3B82F6' }}
                    >
                      {/* White lightbulbs around the border */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 2 * Math.PI) / 12;
                        const r = 98; // radius in px for 52x52 container (208px diameter)
                        const x = 104 + r * Math.cos(angle);
                        const y = 104 + r * Math.sin(angle);
                        return (
                          <div 
                            key={i} 
                            className="absolute w-2.5 h-2.5 rounded-full bg-white border border-white/50 shadow-[0_0_6px_#fef08a] z-10"
                            style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
                          />
                        );
                      })}

                      {/* The spinnable inner wheel */}
                      <div 
                        className="w-full h-full rounded-full border-4 border-white/20 flex items-center justify-center relative overflow-hidden"
                        style={{ 
                          background: `conic-gradient(${
                            Array.from({ length: formData.slotsCount }).map((_, idx) => {
                              const color = formData.slots[idx]?.color || (idx % 2 === 0 ? (formData.evenSlotColor || '#F7AE14') : (formData.oddSlotColor || '#5079F5'));
                              const startDeg = (idx * 360) / formData.slotsCount;
                              const endDeg = ((idx + 1) * 360) / formData.slotsCount;
                              return `${color} ${startDeg}deg ${endDeg}deg`;
                            }).join(', ')
                          })` 
                        }}
                      >
                        {/* Render labels for each segment */}
                        {Array.from({ length: formData.slotsCount }).map((_, idx) => {
                          const angle = (idx * 360) / formData.slotsCount + (180 / formData.slotsCount);
                          const gift = giftsList.find(g => g._id === formData.slots[idx]?.giftId);
                          const label = gift ? gift.name : 'CHƯA GÁN';
                          return (
                            <div
                              key={idx}
                              className="absolute text-[5px] font-black text-white/95 uppercase tracking-widest text-center select-none w-14"
                              style={{
                                transform: `rotate(${angle}deg) translate(0, -60px) rotate(180deg)`,
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden'
                              }}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pointer arrow (stays STILL, outside spinnable wheel, pointing UP) */}
                      <div 
                        className="absolute z-40"
                        style={{ 
                          top: 'calc(50% - 39px)', 
                          left: '50%', 
                          transform: 'translateX(-50%)',
                          width: 0, 
                          height: 0, 
                          borderLeft: '8px solid transparent', 
                          borderRight: '8px solid transparent', 
                          borderBottom: `15px solid ${formData.pointerColor || '#EC4899'}`,
                          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))'
                        }} 
                      />

                      {/* Mock Spin Center (Pink circle with "QUAY") */}
                      <div 
                        className="absolute w-12 h-12 rounded-full text-white flex items-center justify-center text-[8px] font-black border-0 shadow-lg z-30 select-none cursor-pointer"
                        style={{ 
                          background: `radial-gradient(circle at 35% 35%, ${darkenColor(formData.pointerColor || '#EC4899', -15)} 0%, ${formData.pointerColor || '#EC4899'} 65%, ${darkenColor(formData.pointerColor || '#EC4899', 15)} 100%)`,
                          boxShadow: '0 0 0 3px #ffffff, 0 8px 20px rgba(0,0,0,0.4), inset 0 3px 6px rgba(255,255,255,0.45)'
                        }}
                      >
                        QUAY
                      </div>
                    </div>

                    {/* Bottom HUD */}
                    <div className="absolute bottom-4 left-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-between text-white text-[8px] font-bold">
                      <div className="text-left space-y-0.5">
                        <p className="opacity-60 uppercase">Lượt quay</p>
                        <p className="text-emerald-400 font-extrabold">🎫 3 lượt</p>
                      </div>
                      <div className="px-2 py-1 bg-primary rounded-md text-[7px]">
                        Đổi lượt
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Quản lý Kho Quà Tặng */}
          {activeTab === 'gifts' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">
                  🎁 Kho Quà Tặng (Gift Repository)
                </h3>
                <button
                  onClick={() => {
                    setEditingGift({
                      name: '',
                      image: '',
                      quantity: 10,
                      quantityRemaining: 10,
                      claimedCount: 0,
                      prizeType: 'normal',
                      receiveMethod: 'direct',
                      voucherId: ''
                    });
                    setIsGiftModalOpen(true);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold border-0 shadow-sm cursor-pointer hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Thêm quà tặng mới
                </button>
              </div>

              {giftsList.length === 0 ? (
                <div className="py-20 text-center text-xs text-gray-450 font-bold space-y-2">
                  <p>Kho quà hiện đang trống.</p>
                  <p className="font-semibold text-[11px] text-gray-400">Vui lòng nhấp nút "+ Thêm quà tặng" ở trên để khởi tạo quà trong kho.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border dark:border-gray-700 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 text-gray-550 font-bold border-b dark:border-gray-700">
                        <th className="p-3">Hình ảnh</th>
                        <th className="p-3">Tên quà</th>
                        <th className="p-3">Loại giải</th>
                        <th className="p-3">Tổng số lượng</th>
                        <th className="p-3">Còn lại</th>
                        <th className="p-3">Đã trúng</th>
                        <th className="p-3">Cách nhận</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {giftsList.map(gift => (
                        <tr key={gift._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="p-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border dark:border-gray-700 bg-gray-50 flex items-center justify-center">
                              {gift.image ? (
                                <img src={gift.image.startsWith('http') ? gift.image : `${API_BASE}${gift.image}`} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span className="text-sm">🎁</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-left">
                            <p className="font-extrabold text-gray-850 dark:text-white">{gift.name}</p>
                            {gift.voucherId && (
                              <p className="text-[10px] text-indigo-655 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded inline-block mt-0.5 border border-indigo-100 dark:border-indigo-900/30">
                                🎟️ Voucher: {typeof gift.voucherId === 'object' ? gift.voucherId.code : gift.voucherId}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2.5 py-1 rounded-lg border text-[10px] font-bold ${PRIZE_TYPE_COLORS[gift.prizeType]}`}>
                              {PRIZE_TYPE_LABELS[gift.prizeType]}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-gray-600 dark:text-gray-300">
                            {gift.quantity === -1 ? 'Vô hạn' : gift.quantity.toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 font-bold text-indigo-650 dark:text-indigo-400">
                            {gift.quantityRemaining === -1 ? 'Vô hạn' : gift.quantityRemaining.toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 font-bold text-emerald-650 dark:text-emerald-400">
                            {gift.claimedCount.toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 text-gray-500 font-semibold">
                            {gift.receiveMethod === 'direct' ? 'Lấy trực tiếp' : 'Gửi online'}
                          </td>
                          <td className="p-3 text-right flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingGift(gift);
                                setIsGiftModalOpen(true);
                              }}
                              className="p-2 text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl cursor-pointer border-0 bg-transparent"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Bạn chắc chắn muốn xóa quà tặng này ra khỏi kho?')) {
                                  deleteGiftMutation.mutate(gift._id!);
                                }
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer border-0 bg-transparent"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Lịch Sử Quay */}
          {activeTab === 'history' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Stats overview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border dark:border-indigo-900/30 text-left space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tổng lượt quay</span>
                  <span className="text-2xl font-black text-indigo-750 dark:text-indigo-400">{historyStats.totalSpins}</span>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border dark:border-emerald-900/30 text-left space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Đã trúng quà</span>
                  <span className="text-2xl font-black text-emerald-750 dark:text-emerald-400">{historyStats.totalPrizes}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-750/30 p-4 rounded-2xl border dark:border-gray-700 text-left space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Chúc may mắn hụt</span>
                  <span className="text-2xl font-black text-gray-600 dark:text-gray-400">{historyStats.noPrizeCount}</span>
                </div>
              </div>

              {/* Filters toolbar */}
              <div className="flex justify-between items-center flex-wrap gap-4 border-b dark:border-gray-700 pb-3">
                <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">
                  📜 Nhật ký quay thưởng chi tiết
                </h3>

                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <select
                    value={filterPrizeType}
                    onChange={(e) => {
                      setFilterPrizeType(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="px-3 py-1.5 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-primary"
                  >
                    <option value="">Tất cả giải thưởng</option>
                    <option value="normal">Giải bình thường</option>
                    <option value="no_prize">Chúc may mắn</option>
                  </select>
                </div>
              </div>

              {/* History Table */}
              {isHistoryLoading ? (
                <div className="py-20 text-center">
                  <RefreshCw className="animate-spin mx-auto text-primary" size={24} />
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 font-bold">Không có bản ghi lịch sử quay nào hợp lệ.</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border dark:border-gray-700 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 text-gray-550 font-bold border-b dark:border-gray-700">
                          <th className="p-3">STT</th>
                          <th className="p-3">Khách hàng</th>
                          <th className="p-3">Thời gian</th>
                          <th className="p-3">Tên quà</th>
                          <th className="p-3">Loại giải</th>
                          <th className="p-3">Bị Fallback?</th>
                          <th className="p-3">Trạng thái nhận</th>
                          <th className="p-3">Ghi chú (Admin)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {historyList.map((record: any, index: number) => (
                          <tr key={record._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <td className="p-3 text-gray-400 font-bold">
                              {(historyPage - 1) * 15 + index + 1}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0">
                                  {record.customerId?.avatar ? (
                                    <img src={record.customerId.avatar.startsWith('http') ? record.customerId.avatar : `${API_BASE}${record.customerId.avatar}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-indigo-100 text-indigo-700">
                                      {record.customerId?.name?.slice(0, 1) || 'C'}
                                    </div>
                                  )}
                                </div>
                                <div className="text-left leading-tight">
                                  <p className="font-bold text-gray-850 dark:text-white">{record.customerId?.name || 'Khách ẩn'}</p>
                                  <p className="text-[10px] text-gray-400">{record.customerId?.phone || record.customerId?.email || 'Không có sđt'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-gray-450 font-mono">
                              {new Date(record.spinAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="p-3 font-extrabold text-gray-800 dark:text-white">
                              {record.slotName}
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${PRIZE_TYPE_COLORS[record.prizeType] || 'bg-gray-100 text-gray-600'}`}>
                                {PRIZE_TYPE_LABELS[record.prizeType] || record.prizeType}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {record.isFallback ? (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">Fallback</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              {record.prizeType === 'no_prize' ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <select
                                  value={record.rewardStatus}
                                  onChange={(e) => updateRewardMutation.mutate({ id: record._id, payload: { rewardStatus: e.target.value } })}
                                  disabled={updateRewardMutation.isPending}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold outline-none border cursor-pointer ${REWARD_STATUS_COLORS[record.rewardStatus]}`}
                                >
                                  <option value="pending">Chờ xử lý</option>
                                  <option value="contacted">Đã liên hệ</option>
                                  <option value="delivered">Đã giao</option>
                                  <option value="cancelled">Đã huỷ</option>
                                </select>
                              )}
                            </td>
                            <td className="p-3">
                              {editingNoteId === record._id ? (
                                <div className="flex items-center gap-1.5">
                                  <input 
                                    type="text" 
                                    value={tempNoteText}
                                    onChange={(e) => setTempNoteText(e.target.value)}
                                    className="px-2 py-1 border rounded-lg text-xs bg-transparent outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      updateRewardMutation.mutate({ id: record._id, payload: { adminNote: tempNoteText } });
                                      setEditingNoteId(null);
                                    }}
                                    className="px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold border-0 cursor-pointer"
                                  >
                                    Lưu
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 justify-between">
                                  <span className="text-gray-500 italic max-w-[120px] truncate block">{record.adminNote || 'Chưa có ghi chú...'}</span>
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(record._id);
                                      setTempNoteText(record.adminNote || '');
                                    }}
                                    className="text-[10px] font-bold text-primary underline bg-transparent border-0 cursor-pointer"
                                  >
                                    Sửa
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination control */}
                  {historyPagination.totalPages > 1 && (
                    <div className="flex justify-between items-center pt-3">
                      <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        Trước
                      </button>
                      <span className="text-xs text-gray-400 font-bold">
                        Trang {historyPage} / {historyPagination.totalPages}
                      </span>
                      <button
                        onClick={() => setHistoryPage(p => Math.min(historyPagination.totalPages, p + 1))}
                        disabled={historyPage === historyPagination.totalPages}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        Sau
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* Gift Creation / Editing Dialog Modal */}
      {isGiftModalOpen && editingGift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border dark:border-gray-700 max-w-md w-full p-6 space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">
                {editingGift._id ? '⚙️ Cập nhật quà tặng' : '🎁 Khởi tạo quà tặng mới'}
              </h3>
              <button 
                onClick={() => { setIsGiftModalOpen(false); setEditingGift(null); }}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white border-0 bg-transparent cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Liên kết Voucher Khuyến mãi (Không bắt buộc)</label>
                <select
                  value={editingGift.voucherId ? (typeof editingGift.voucherId === 'object' ? editingGift.voucherId._id : editingGift.voucherId) : ''}
                  onChange={(e) => {
                    const vId = e.target.value;
                    const foundVoucher = promotionsList.find(p => p._id === vId);
                    setEditingGift(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        voucherId: vId || undefined,
                        name: foundVoucher ? foundVoucher.name : prev.name,
                        image: (foundVoucher?.image || prev.image) || '',
                        receiveMethod: foundVoucher ? 'online' : prev.receiveMethod
                      };
                    });
                  }}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                >
                  <option value="">-- Không liên kết Voucher --</option>
                  {promotionsList.map((promo: any) => (
                    <option key={promo._id} value={promo._id}>
                      {promo.code} - {promo.name} ({promo.isVisible !== false ? 'Hiển thị' : 'Ẩn'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tên quà tặng</label>
                <input 
                  type="text" 
                  value={editingGift.name}
                  onChange={(e) => setEditingGift(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                  placeholder="Ví dụ: Voucher học phí 30%"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Loại giải</label>
                  <select
                    value={editingGift.prizeType}
                    onChange={(e) => setEditingGift(prev => prev ? { ...prev, prizeType: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                  >
                    <option value="normal">Bình thường</option>
                    <option value="no_prize">Chúc may mắn</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cách nhận</label>
                  <select
                    value={editingGift.receiveMethod}
                    onChange={(e) => setEditingGift(prev => prev ? { ...prev, receiveMethod: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                  >
                    <option value="direct">Lấy trực tiếp</option>
                    <option value="online">Gửi online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Số lượng kho</label>
                  <input 
                    type="number" 
                    value={editingGift.quantity}
                    onChange={(e) => setEditingGift(prev => prev ? { ...prev, quantity: Math.max(-1, Number(e.target.value) || 0) } : null)}
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                    placeholder="-1 = Vô hạn"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Hạn dùng (số ngày)</label>
                  <input 
                    type="number" 
                    value={editingGift.expiryDays || 0}
                    onChange={(e) => setEditingGift(prev => prev ? { ...prev, expiryDays: Math.max(0, Number(e.target.value) || 0) } : null)}
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-sm text-gray-800 dark:text-white outline-none focus:border-primary font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Link hình ảnh quà tặng</label>
                <input 
                  type="text" 
                  value={editingGift.image}
                  onChange={(e) => setEditingGift(prev => prev ? { ...prev, image: e.target.value } : null)}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent text-xs text-gray-800 dark:text-white outline-none focus:border-primary"
                  placeholder="http://example.com/image.png hoặc link upload"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t dark:border-gray-700">
              <button
                onClick={() => { setIsGiftModalOpen(false); setEditingGift(null); }}
                className="px-4 py-2 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-750 dark:text-gray-300 rounded-xl text-xs font-bold border-0 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => editingGift && saveGiftMutation.mutate(editingGift)}
                disabled={saveGiftMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold border-0 cursor-pointer hover:bg-indigo-700 disabled:opacity-50"
              >
                {saveGiftMutation.isPending ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
