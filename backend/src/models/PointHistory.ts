import mongoose, { Document, Schema } from 'mongoose';

export interface IPointHistory extends Document {
    customer: mongoose.Types.ObjectId;
    order?: mongoose.Types.ObjectId | null;
    points: number;
    type: 'earn' | 'spend' | 'adjust' | 'refund';
    reason: string;
    createdAt: Date;
}

const pointHistorySchema = new Schema<IPointHistory>({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    points: { type: Number, required: true },
    type: { type: String, enum: ['earn', 'spend', 'adjust', 'refund'], required: true },
    reason: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IPointHistory>('PointHistory', pointHistorySchema);
