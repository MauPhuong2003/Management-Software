import mongoose, { Document, Schema } from 'mongoose';

export interface IShippingConfig extends Document {
    mode: 'fixed' | 'by_province';
    fixedFee: number;
    provinceFees: { province: string, fee: number }[];
    status: 'active' | 'inactive';
}

const schema = new Schema<IShippingConfig>({
    mode: { type: String, enum: ['fixed', 'by_province'], default: 'fixed' },
    fixedFee: { type: Number, default: 0 },
    provinceFees: [{ province: String, fee: Number }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export default mongoose.model<IShippingConfig>('ShippingConfig', schema);
