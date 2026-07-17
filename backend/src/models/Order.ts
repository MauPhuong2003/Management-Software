import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
    orderCode: string;
    customer: mongoose.Types.ObjectId | null;
    items: {
        product: mongoose.Types.ObjectId;
        variantSku?: string | null;
        qty: number;
        price: number;
        isGift?: boolean;
        giftNote?: string;
    }[];
    totalAmount: number;
    discountAmount?: number;
    promotionCode?: string | null;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    orderSource?: 'pos' | 'website';
    note: string;
    loyaltyAwarded: boolean;
    loyaltyPointsUsed?: number;
    loyaltyDiscount?: number;
    deliveryType?: 'shipping' | 'pickup';
    pickupBranch?: string | null;
    returnRequest?: {
        reason: string;
        images: string[];
        status: 'pending' | 'approved' | 'rejected';
        adminComment?: string;
        createdAt: Date;
    } | null;
    paymentProof?: string | null;
    paymentProofSubmittedAt?: Date | null;
}

const orderSchema = new Schema<IOrder>({
    orderCode: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantSku: { type: String, default: null },
        qty: { type: Number, required: true },
        price: { type: Number, required: true, min: 0 },
        isGift: { type: Boolean, default: false },
        giftNote: { type: String, default: '' }
    }],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    promotionCode: { type: String, default: null },
    paymentMethod: { type: String, default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    orderStatus: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'], default: 'pending' },
    orderSource: { type: String, enum: ['pos', 'website'], default: 'website' },
    note: { type: String, default: '' },
    loyaltyAwarded: { type: Boolean, default: false },
    loyaltyPointsUsed: { type: Number, default: 0 },
    loyaltyDiscount: { type: Number, default: 0 },
    deliveryType: { type: String, enum: ['shipping', 'pickup'], default: 'shipping' },
    pickupBranch: { type: String, default: null },
    paymentProof: { type: String, default: null },
    paymentProofSubmittedAt: { type: Date, default: null },
    returnRequest: {
        type: {
            reason: { type: String },
            images: [{ type: String }],
            status: { type: String, enum: ['pending', 'approved', 'rejected'] },
            adminComment: { type: String, default: '' },
            createdAt: { type: Date }
        },
        default: undefined
    }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', orderSchema);
