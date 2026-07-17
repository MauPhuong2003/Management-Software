import mongoose, { Document, Schema } from 'mongoose';

export interface ISpinHistory extends Document {
    customerId: mongoose.Types.ObjectId;
    miniGameId: mongoose.Types.ObjectId;
    giftId?: mongoose.Types.ObjectId;
    slotIndex: number;
    slotName: string;
    prizeType: 'normal' | 'no_prize';
    prizeDescription: string;
    isFallback: boolean;
    pointsSpent: number;
    spinAt: Date;
    rewardStatus: 'pending' | 'contacted' | 'delivered' | 'cancelled';
    adminNote?: string;
}

const spinHistorySchema = new Schema<ISpinHistory>({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    miniGameId: { type: mongoose.Schema.Types.ObjectId, ref: 'MiniGame', required: true },
    giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift' },
    slotIndex: { type: Number, required: true },
    slotName: { type: String, required: true },
    prizeType: { type: String, enum: ['normal', 'no_prize'], required: true },
    prizeDescription: { type: String, default: '' },
    isFallback: { type: Boolean, default: false },
    pointsSpent: { type: Number, default: 0 },
    spinAt: { type: Date, default: Date.now },
    rewardStatus: { type: String, enum: ['pending', 'contacted', 'delivered', 'cancelled'], default: 'pending' },
    adminNote: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model<ISpinHistory>('SpinHistory', spinHistorySchema);
