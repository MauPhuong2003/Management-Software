import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
    orderCode: string;
    customer: mongoose.Types.ObjectId | null;
    items: {
        product: mongoose.Types.ObjectId;
        variantSku?: string | null;
        qty: number;
        price: number;
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
}

const orderSchema = new Schema<IOrder>({
    orderCode: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantSku: { type: String, default: null },
        qty: { type: Number, required: true },
        price: { type: Number, required: true }
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
    loyaltyDiscount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', orderSchema);
