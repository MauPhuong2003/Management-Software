import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashSaleProduct {
    product: mongoose.Types.ObjectId;
    discountPercent: number;
    limitQty: number;
    soldQty: number;
    active: boolean;
}

export interface IFlashSale extends Document {
    name: string;
    banner?: string;
    startTime: Date;
    endTime: Date;
    status: 'active' | 'inactive';
    products: IFlashSaleProduct[];
}

const flashSaleProductSchema = new Schema<IFlashSaleProduct>({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    discountPercent: { type: Number, required: true, default: 0 },
    limitQty: { type: Number, required: true, default: 0 },
    soldQty: { type: Number, required: true, default: 0 },
    active: { type: Boolean, required: true, default: true }
});

const flashSaleSchema = new Schema<IFlashSale>({
    name: { type: String, required: true },
    banner: { type: String, default: '' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    products: [flashSaleProductSchema]
}, { timestamps: true });

export default mongoose.model<IFlashSale>('FlashSale', flashSaleSchema);
