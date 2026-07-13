import mongoose, { Document, Schema } from 'mongoose';

export interface ILoyaltyTier {
    name: string;
    minPoints: number;
    pointMultiplier: number;    // Hệ số nhân điểm khi tích
    discountPercent: number;    // % giảm giá tự động theo hạng
    color: string;
    icon: string;
    isActive: boolean;
}

export interface ILoyaltyConfig extends Document {
    // Tích điểm
    vndToEarnOnePoint: number;      // X VNĐ = 1 điểm (vd: 100.000)
    applyToOrders: 'all' | 'pos' | 'website';  // Loại đơn được tích điểm
    delayDaysAfterPayment: number;  // Tích điểm sau X ngày kể từ thanh toán thành công

    // Dùng điểm
    minOrderToUsePoints: number;    // Giá trị đơn tối thiểu để dùng điểm
    maxPointUsagePercent: number;   // % tối đa giá trị đơn có thể dùng điểm
    vndPerPointRedemption: number;  // 1 điểm = X VNĐ khi dùng thanh toán

    // Hạng thành viên
    tiers: ILoyaltyTier[];
    isActive: boolean;
}

const tierSchema = new Schema<ILoyaltyTier>({
    name: { type: String, required: true },
    minPoints: { type: Number, required: true, default: 0 },
    pointMultiplier: { type: Number, required: true, default: 1 },
    discountPercent: { type: Number, required: true, default: 0 },
    color: { type: String, default: '#6B7280' },
    icon: { type: String, default: '🥉' },
    isActive: { type: Boolean, default: true }
}, { _id: false });

const loyaltyConfigSchema = new Schema<ILoyaltyConfig>({
    vndToEarnOnePoint: { type: Number, default: 100000 },
    applyToOrders: { type: String, enum: ['all', 'pos', 'website'], default: 'all' },
    delayDaysAfterPayment: { type: Number, default: 0 },

    minOrderToUsePoints: { type: Number, default: 0 },
    maxPointUsagePercent: { type: Number, default: 1 },
    vndPerPointRedemption: { type: Number, default: 1000 },

    tiers: {
        type: [tierSchema], default: [
            { name: 'Đồng', minPoints: 0, pointMultiplier: 1, discountPercent: 0, color: '#6B7280', icon: '🥉', isActive: true },
            { name: 'Bạc', minPoints: 1000, pointMultiplier: 1.5, discountPercent: 2, color: '#9CA3AF', icon: '🥈', isActive: true },
            { name: 'Vàng', minPoints: 5000, pointMultiplier: 2, discountPercent: 5, color: '#F59E0B', icon: '🥇', isActive: true },
            { name: 'Kim Cương', minPoints: 10000, pointMultiplier: 3, discountPercent: 7, color: '#60A5FA', icon: '💎', isActive: true },
        ]
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<ILoyaltyConfig>('LoyaltyConfig', loyaltyConfigSchema);
