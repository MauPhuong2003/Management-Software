import React, { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { shopService } from '../services/shopService';
import { useAuthStore } from '../store/authStore';
import { 
  RefreshCw, 
  Star, 
  Ticket, 
  Gift, 
  ChevronLeft, 
  AlertCircle, 
  History, 
  X, 
  Trophy, 
  Frown,
  Coins
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const DEFAULT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#f43f5e', '#14b8a6', '#f97316', '#06b6d4'
];

interface Slot {
  _id?: string;
  name: string;
  type: 'physical' | 'voucher' | 'no_prize';
  color?: string;
  voucherCode?: string;
  voucherValue?: number;
  physicalGiftName?: string;
  image?: string;
  giftId?: string;
}

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

export default function LuckyWheel() {
  const queryClient = useQueryClient();
  const { customer } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const [currentRotation, setCurrentRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState<any>(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeQuantity, setExchangeQuantity] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  // Queries
  const { data: activeGameRes, isLoading: isGameLoading } = useQuery({
    queryKey: ['active-minigame'],
    queryFn: shopService.getActiveMiniGame,
  });

  const { data: historyRes, refetch: refetchHistory } = useQuery({
    queryKey: ['my-spin-history', historyPage],
    queryFn: () => shopService.getSpinHistory({ page: historyPage, limit: 10 }),
    enabled: !!customer,
  });

  const { data: profileRes } = useQuery({
    queryKey: ['shop-profile'],
    queryFn: shopService.getProfile,
    enabled: !!customer,
  });

  // Mutations
  const spinMutation = useMutation({
    mutationFn: shopService.spin,
  });

  const exchangeMutation = useMutation({
    mutationFn: shopService.exchangePointsForSpins,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['active-minigame'] });
      queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
      alert(data.message || 'Đổi lượt quay thành công!');
      setShowExchangeModal(false);
      setExchangeQuantity(1);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể đổi lượt quay');
    }
  });

  const minigame = activeGameRes?.data?.minigame;
  const spinsRemaining = activeGameRes?.data?.spinsRemaining ?? 0;
  const loyaltyPoints = profileRes?.data?.loyaltyPoints ?? customer?.loyaltyPoints ?? 0;

  const centerBase = minigame?.pointerColor || '#EC4899';
  const centerLight = darkenColor(centerBase, -15);
  const centerDark = darkenColor(centerBase, 15);

  const slots: Slot[] = minigame?.slots || [];
  const wheelSize = minigame?.wheelSize || 360;

  // Draw the wheel onto canvas
  useEffect(() => {
    if (slots.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = wheelSize;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 8;
    const slotAngle = (2 * Math.PI) / slots.length;

    const loadedImages: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    const slotsWithImages = slots.filter(s => s.image);

    const drawWheel = () => {
      ctx.clearRect(0, 0, size, size);

      // Outer ring - Metallic Gold gradient
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, 0, 2 * Math.PI);
      const goldGrad = ctx.createLinearGradient(0, 0, size, size);
      goldGrad.addColorStop(0, '#FFE082');
      goldGrad.addColorStop(0.3, '#FFB300');
      goldGrad.addColorStop(0.5, '#FFF9C4');
      goldGrad.addColorStop(0.7, '#FFA000');
      goldGrad.addColorStop(1, '#8D6E63');
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 10;
      ctx.stroke();

      // Draw individual segments
      slots.forEach((slot, i) => {
        const startAngle = i * slotAngle - Math.PI / 2;
        const endAngle = startAngle + slotAngle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        
        const baseColor = slot.color || (i % 2 === 0 ? (minigame?.evenSlotColor || '#F7AE14') : (minigame?.oddSlotColor || '#5079F5'));
        const grad = ctx.createRadialGradient(cx, cy, size * 0.15, cx, cy, radius);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, darkenColor(baseColor, 18));
        
        ctx.fillStyle = grad;
        ctx.fill();

        // Golden dividers between segments
        ctx.strokeStyle = 'rgba(218, 165, 32, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text wrapping & rotation
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + slotAngle / 2);

        // Draw image if loaded
        const slotImg = loadedImages[slot.giftId || ''];
        if (slotImg) {
          const imgSize = Math.max(22, Math.floor(size / 14));
          const imgX = radius * 0.38; // distance from center cap
          ctx.drawImage(slotImg, imgX - imgSize / 2, -imgSize / 2, imgSize, imgSize);
        }

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.floor(size / 32))}px sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;

        const name = slot.name || '';
        const words = name.split(' ');
        let line = '';
        let y = -4;
        const maxWidth = radius * 0.52; // Prevent overlapping the image
        const lines: string[] = [];

        words.forEach(word => {
          const test = line + word + ' ';
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line.trim());
            line = word + ' ';
          } else {
            line = test;
          }
        });
        lines.push(line.trim());

        const lineHeight = Math.max(10, Math.floor(size / 32)) + 2;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((l, index) => {
          ctx.fillText(l, radius - 15, startY + index * lineHeight);
        });

        ctx.restore();
      });
    };

    if (slotsWithImages.length === 0) {
      drawWheel();
    } else {
      slotsWithImages.forEach(slot => {
        if (!slot.image) {
          loadedCount++;
          if (loadedCount === slotsWithImages.length) drawWheel();
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const imgUrl = slot.image.startsWith('http') ? slot.image : `${API_BASE}${slot.image}`;
        img.src = imgUrl;
        img.onload = () => {
          loadedImages[slot.giftId || ''] = img;
          loadedCount++;
          if (loadedCount === slotsWithImages.length) {
            drawWheel();
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === slotsWithImages.length) {
            drawWheel();
          }
        };
      });
    }
  }, [slots, wheelSize]);

  // Spin handler
  const handleSpin = async () => {
    if (isSpinning || spinsRemaining <= 0 || !wheelRef.current) return;
    setIsSpinning(true);
    setShowResult(null);

    const wheel = wheelRef.current;
    const duration = minigame?.spinDuration || 5;

    // Step 1: Immediately start a fast continuous spinning animation
    wheel.style.transition = 'none';
    const fastSpinKeyframes = `
      @keyframes wheel-fast-spin {
        from { transform: rotate(${currentRotation}deg); }
        to { transform: rotate(${currentRotation + 360}deg); }
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = fastSpinKeyframes;
    document.head.appendChild(styleEl);
    wheel.style.animation = 'wheel-fast-spin 0.5s linear infinite';

    try {
      // Step 2: Call API while wheel is spinning fast
      const res = await spinMutation.mutateAsync();
      const winningIndex = res.data?.slotIndex ?? 0;
      const slotDeg = 360 / slots.length;

      // Step 3: Calculate target angle
      const targetSlotAngle = winningIndex * slotDeg + slotDeg / 2;
      const normalizedTarget = (360 - targetSlotAngle) % 360;
      const extraSpins = 5 * 360;
      const targetRotation = Math.ceil(currentRotation / 360) * 360 + extraSpins + normalizedTarget;

      // Step 4: Stop fast spinning, apply deceleration transition to target
      wheel.style.animation = 'none';
      styleEl.remove();

      // Force a reflow to ensure the browser registers the animation removal
      void wheel.offsetHeight;

      wheel.style.transition = `transform ${duration}s cubic-bezier(0.15, 0.85, 0.15, 1)`;
      wheel.style.transform = `rotate(${targetRotation}deg)`;
      setCurrentRotation(targetRotation);

      // Step 5: After deceleration, show result
      setTimeout(() => {
        setIsSpinning(false);
        setShowResult(res.data);
        queryClient.invalidateQueries({ queryKey: ['active-minigame'] });
        queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
        refetchHistory();
      }, duration * 1000 + 300);
    } catch (err: any) {
      wheel.style.animation = 'none';
      styleEl.remove();
      wheel.style.transition = 'none';
      setIsSpinning(false);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện quay.');
    }
  };

  const handleExchange = () => {
    if (exchangeQuantity < 1) return;
    exchangeMutation.mutate({ quantity: exchangeQuantity });
  };

  if (isGameLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="animate-spin text-primary" size={36} />
        <p className="text-sm font-semibold text-gray-500">Đang tải dữ liệu Vòng Quay...</p>
      </div>
    );
  }

  if (!minigame) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center space-y-5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl shadow-sm">
        <div className="w-16 h-16 mx-auto bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Không có sự kiện Vòng Quay</h2>
          <p className="text-xs text-gray-400">Hiện tại cửa hàng không kích hoạt hoặc chưa cấu hình sự kiện Vòng Quay May Mắn nào.</p>
        </div>
        <Link to="/account" className="inline-block px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity">
          Quay lại tài khoản
        </Link>
      </div>
    );
  }

  const historyList = historyRes?.data || [];
  const pagination = historyRes?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/account" className="p-2 rounded-xl hover:bg-white/10 dark:hover:bg-gray-800/50 text-gray-500 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="text-left">
          <h1 className="text-xl font-black text-gray-900 dark:text-white">🎡 {minigame.name}</h1>
          <p className="text-xs text-gray-500">Chơi mini-game hấp dẫn đổi lấy phần quà cực đỉnh!</p>
        </div>
      </div>

      {/* Main Wheel Board */}
      <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-indigo-950 flex flex-col items-center justify-center p-8 select-none" style={{ minHeight: '480px' }}>
        {/* Banner background if configured */}
        {minigame.bannerDesktop && (
          <img 
            src={minigame.bannerDesktop.startsWith('http') ? minigame.bannerDesktop : `${API_BASE}${minigame.bannerDesktop}`} 
            alt="Desktop Banner" 
            className="hidden md:block w-full h-full object-cover absolute inset-0 opacity-40" 
          />
        )}
        {minigame.bannerMobile && (
          <img 
            src={minigame.bannerMobile.startsWith('http') ? minigame.bannerMobile : `${API_BASE}${minigame.bannerMobile}`} 
            alt="Mobile Banner" 
            className="block md:hidden w-full h-full object-cover absolute inset-0 opacity-40" 
          />
        )}
        {(!minigame.bannerDesktop && !minigame.bannerMobile) && (
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-slate-900 to-purple-950 opacity-100" />
        )}

        {/* Style injection block for premium animations */}
        <style>{`
          @keyframes neon-glow {
            0%, 100% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.35), 0 0 30px rgba(251, 191, 36, 0.15); }
            50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.7), 0 0 50px rgba(251, 191, 36, 0.4); }
          }
          @keyframes bulb-blink-even {
            0%, 100% { background-color: #fffbeb; box-shadow: 0 0 12px #fde047, 0 0 25px #eab308; border-color: #fef08a; }
            50% { background-color: #78350f; box-shadow: 0 0 2px rgba(0,0,0,0.4); border-color: #451a03; }
          }
          @keyframes bulb-blink-odd {
            0%, 100% { background-color: #78350f; box-shadow: 0 0 2px rgba(0,0,0,0.4); border-color: #451a03; }
            50% { background-color: #fffbeb; box-shadow: 0 0 12px #fde047, 0 0 25px #eab308; border-color: #fef08a; }
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

        {/* Wheel layout absolute frame */}
        <div 
          className="relative z-10 my-6 flex items-center justify-center animate-neon-glow rounded-full animate-fade-in" 
          style={{ 
            width: wheelSize, 
            height: wheelSize,
            background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%)'
          }}
        >
          {/* Glowing Vegas border bulbs */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 2 * Math.PI) / 12;
            const r = (wheelSize / 2) - 6;
            const x = (wheelSize / 2) + r * Math.cos(angle);
            const y = (wheelSize / 2) + r * Math.sin(angle);
            return (
              <div 
                key={i}
                className={`absolute w-4 h-4 rounded-full border-2 z-30 transition-all duration-300 ${
                  isSpinning 
                    ? (i % 2 === 0 ? 'bulb-even-active' : 'bulb-odd-active')
                    : 'bg-[#fffbeb] border-[#fde047] shadow-[0_0_10px_#fde047,0_0_20px_#eab308]'
                }`}
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`, 
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          })}

          {/* Pointer arrow (stays STILL in the center, pointing UP above the center spin button) */}
          <div 
            className="absolute z-40"
            style={{ 
              top: 'calc(50% - 46px)', 
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, 
              height: 0, 
              borderLeft: '9px solid transparent', 
              borderRight: '9px solid transparent', 
              borderBottom: `18px solid ${minigame?.pointerColor || '#EC4899'}`, 
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' 
            }} 
          />

          {/* Spinnable wrapper div */}
          <div 
            ref={wheelRef} 
            className="w-full h-full animate-fade-in duration-300"
            style={{ willChange: 'transform' }}
          >
            <canvas 
              ref={canvasRef} 
              width={wheelSize} 
              height={wheelSize} 
              style={{ borderRadius: '50%' }} 
            />
          </div>

          {/* Core Spin center button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || spinsRemaining <= 0}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-16 h-16 rounded-full font-black text-xs text-white flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed border-0"
            style={{ 
              background: isSpinning 
                ? '#4b5563' 
                : `radial-gradient(circle at 35% 35%, ${centerLight} 0%, ${centerBase} 65%, ${centerDark} 100%)`,
              boxShadow: `0 0 0 4px #ffffff, 0 12px 28px rgba(0, 0, 0, 0.45), inset 0 4px 10px rgba(255, 255, 255, 0.45)`
            }}
          >
            {isSpinning ? (
              <RefreshCw size={20} className="animate-spin text-white" />
            ) : (
              <>
                <span className="text-lg">🎡</span>
                <span className="tracking-widest">QUAY</span>
              </>
            )}
          </button>
        </div>

        {/* HUD control overlay bottom */}
        <div className="w-full mt-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-6 justify-center sm:justify-start">
            <div className="text-left">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Điểm tích lũy</span>
              <span className="text-sm font-black text-amber-400 flex items-center gap-1">⭐ {loyaltyPoints.toLocaleString()}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-left">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Lượt quay</span>
              <span className="text-sm font-black text-emerald-400 flex items-center gap-1">🎫 {spinsRemaining} lượt</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowExchangeModal(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold border-0 cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm"
          >
            🔄 Đổi điểm lấy lượt
          </button>
        </div>
      </div>

      {/* Legend details */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 space-y-4 text-left animate-fade-in duration-300">
        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
          🎁 Danh sách phần thưởng trong vòng quay
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slots.map((s, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-755 border dark:border-gray-700/50">
              <div className="w-10 h-10 rounded-xl overflow-hidden border dark:border-gray-700 bg-white flex items-center justify-center shrink-0 shadow-sm">
                {s.image ? (
                  <img 
                    src={s.image.startsWith('http') ? s.image : `${API_BASE}${s.image}`} 
                    alt={s.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-lg">🎁</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-gray-800 dark:text-white truncate">{s.name}</p>
                <p className="text-[10px] text-gray-400 font-medium">
                  {s.type === 'physical' ? '🎁 Quà tặng vật lý' : 
                   s.type === 'voucher' ? `🎟️ Voucher giảm giá ${s.voucherValue}%` : 
                   '😢 Chúc may mắn lần sau'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History section */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-6 space-y-4 text-left animate-fade-in duration-300">
        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
          <History size={16} /> Lịch sử nhận quà của bạn
        </h3>

        {historyList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400 font-medium">
            Bạn chưa thực hiện lượt quay nào trong sự kiện này.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-gray-400 font-bold">
                    <th className="py-2 pr-4">Thời gian</th>
                    <th className="py-2 px-4">Giải thưởng</th>
                    <th className="py-2 px-4">Loại quà</th>
                    <th className="py-2 pl-4">Trạng thái nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {historyList.map((h: any) => (
                    <tr key={h._id} className="text-gray-600 dark:text-gray-300">
                      <td className="py-3 pr-4 font-mono text-[11px] text-gray-450">
                        {new Date(h.spinAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800 dark:text-white">
                        {h.slotName}
                        {h.isFallback && (
                          <span className="ml-1.5 text-[9px] font-black bg-amber-100 text-amber-800 px-1 py-0.5 rounded">
                            Fallback
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.prizeType === 'physical' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          h.prizeType === 'voucher' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {h.prizeType === 'physical' ? 'Quà vật lý' : h.prizeType === 'voucher' ? 'Voucher' : 'Lời chúc'}
                        </span>
                      </td>
                      <td className="py-3 pl-4">
                        {h.prizeType === 'no_prize' ? (
                          <span className="text-gray-400">—</span>
                        ) : h.prizeType === 'voucher' ? (
                          <span className="text-green-600 dark:text-green-400 font-bold">✓ Đã gửi</span>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.rewardStatus === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            h.rewardStatus === 'contacted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            h.rewardStatus === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-750 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {h.rewardStatus === 'delivered' ? 'Đã nhận' :
                             h.rewardStatus === 'contacted' ? 'Đã liên hệ' :
                             h.rewardStatus === 'cancelled' ? 'Đã hủy' : 'Đang xử lý'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center pt-3 border-t dark:border-gray-700">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-xs text-gray-400 font-bold">
                  Trang {historyPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setHistoryPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={historyPage === pagination.totalPages}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exchange Points Modal */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border dark:border-gray-700 max-w-sm w-full p-6 space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                <Coins className="text-amber-500" size={18} /> Đổi điểm lấy lượt quay
              </h3>
              <button 
                onClick={() => setShowExchangeModal(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white border-0 bg-transparent cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border dark:border-indigo-900/30 rounded-2xl p-3 text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                Tỷ lệ quy đổi: <span className="font-black text-indigo-650 dark:text-indigo-300">{(minigame?.pointsPerSpin || 100).toLocaleString()} điểm</span> = <span className="font-black text-indigo-650 dark:text-indigo-300">1 lượt quay</span>.
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Chọn số lượt muốn đổi</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={exchangeQuantity}
                    onChange={(e) => setExchangeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 border dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm text-gray-800 dark:text-white outline-none focus:border-primary"
                  />
                  <div className="text-xs font-semibold text-gray-500">
                    = {(exchangeQuantity * (minigame?.pointsPerSpin || 100)).toLocaleString()} điểm
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-gray-400">
                Bạn đang có: <span className="font-bold text-gray-700 dark:text-gray-250">{loyaltyPoints.toLocaleString()} điểm</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setShowExchangeModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border-0 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleExchange}
                disabled={exchangeMutation.isPending || !minigame || loyaltyPoints < (exchangeQuantity * (minigame?.pointsPerSpin || 100))}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold border-0 cursor-pointer disabled:opacity-50"
              >
                {exchangeMutation.isPending ? 'Đang đổi...' : 'Xác nhận đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result congrats popup modal */}
      {showResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            
            {/* Celebration background rings */}
            {showResult.prizeType !== 'no_prize' && (
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            )}

            <div className="space-y-4">
              {showResult.prizeType === 'no_prize' ? (
                <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-gray-750 text-gray-500 rounded-3xl flex items-center justify-center">
                  <Frown size={44} />
                </div>
              ) : (
                <div className="w-20 h-20 mx-auto bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-3xl flex items-center justify-center relative animate-bounce">
                  <Trophy size={44} />
                  <Star className="absolute top-0 right-0 text-yellow-400 animate-pulse" size={16} fill="currentColor" />
                  <Star className="absolute bottom-2 left-0 text-yellow-400 animate-pulse delay-200" size={12} fill="currentColor" />
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {showResult.prizeType === 'no_prize' ? 'Chúc bạn may mắn lần sau!' : 'Xin chúc mừng!'}
                </h3>
                <p className="text-sm font-black text-indigo-650 dark:text-indigo-400">
                  {showResult.slotName}
                </p>
                {showResult.prizeDescription && showResult.prizeType !== 'no_prize' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {showResult.prizeDescription}
                  </p>
                )}
                {showResult.voucherCode && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-3 space-y-1 my-2">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mã Voucher của bạn</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-400 select-all tracking-wider">{showResult.voucherCode}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(showResult.voucherCode);
                          alert('📋 Đã sao chép mã Voucher!');
                        }}
                        className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-1 rounded-lg border-0 cursor-pointer transition-colors"
                      >
                        Sao chép
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 font-semibold">Sử dụng mã này tại trang thanh toán để được giảm giá!</p>
                  </div>
                )}
                {showResult.isFallback && (
                  <p className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 py-1.5 px-3 rounded-xl border border-amber-200/30 mt-2">
                    💡 Phần quà gốc đã hết số lượng kho. Cửa hàng gửi bạn quà tặng an ủi thay thế!
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowResult(null)}
              className="w-full py-3 bg-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors border-0 cursor-pointer"
            >
              Đóng và tiếp tục
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
