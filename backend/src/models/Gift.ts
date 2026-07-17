import mongoose, { Document, Schema } from 'mongoose';

export interface IGift extends Document {
    name: string;
    image: string;
    quantity: number;
    quantityRemaining: number;
    claimedCount: number;
    prizeType: 'normal' | 'no_prize';
    receiveMethod: 'direct' | 'online';
    expiryDays?: number;
    voucherId?: mongoose.Types.ObjectId; // Link to promotion/voucher
    createdAt: Date;
    updatedAt: Date;
}

const giftSchema = new Schema<IGift>({
    name: { type: String, required: true },
    image: { type: String, default: '' },
    quantity: { type: Number, required: true, default: 0 },
    quantityRemaining: { type: Number, required: true, default: 0 },
    claimedCount: { type: Number, default: 0 },
    prizeType: { type: String, enum: ['normal', 'no_prize'], required: true, default: 'normal' },
    receiveMethod: { type: String, enum: ['direct', 'online'], required: true, default: 'direct' },
    expiryDays: { type: Number, default: 0 },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' }
}, { timestamps: true });

export default mongoose.model<IGift>('Gift', giftSchema);
