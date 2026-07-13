import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotion extends Document {
    code: string;
    type: 'percent' | 'fixed';
    value: number;
    minOrderValue: number;
    startDate: Date;
    endDate: Date;
    status: 'active' | 'inactive';
    applyType: 'product' | 'order' | 'shipping' | 'buy_x_get_y';
    applyProductIds?: mongoose.Types.ObjectId[];
    buyProductId?: mongoose.Types.ObjectId;
    buyQty?: number;
    getProductId?: mongoose.Types.ObjectId;
    discountYValue?: number;
    usageLimit?: number;
    limitPerUser?: number;
    usedCount: number;
}

const promotionSchema = new Schema<IPromotion>({
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    applyType: { type: String, enum: ['product', 'order', 'shipping', 'buy_x_get_y'], default: 'order' },
    applyProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    buyProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    buyQty: { type: Number, default: 1 },
    getProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    discountYValue: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    limitPerUser: { type: Number, default: null },
    usedCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IPromotion>('Promotion', promotionSchema);
