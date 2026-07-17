import mongoose, { Document, Schema } from 'mongoose';

export interface IWheelSlot {
    _id?: mongoose.Types.ObjectId;
    giftId: mongoose.Types.ObjectId;
    color: string;
    probability: number;
}

export interface IMiniGame extends Document {
    name: string;
    isActive: boolean;
    bannerDesktop: string;
    bannerMobile: string;
    wheelSize: number;
    slotsCount: number;
    slots: IWheelSlot[];
    pointsPerSpin: number;
    maxSpinsPerDay: number;
    startDate?: Date;
    endDate?: Date;
    description?: string;
    spinDuration?: number;
    borderColor?: string;
    evenSlotColor?: string;
    oddSlotColor?: string;
    pointerColor?: string;
    createdAt: Date;
    updatedAt: Date;
}

const wheelSlotSchema = new Schema<IWheelSlot>(({
    giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift', required: true },
    color: { type: String, default: '#6366f1' },
    probability: { type: Number, required: true, min: 0, max: 100 }
}) as any);

const miniGameSchema = new Schema<IMiniGame>({
    name: { type: String, required: true, default: 'Vòng Quay May Mắn' },
    isActive: { type: Boolean, default: false },
    bannerDesktop: { type: String, default: '' },
    bannerMobile: { type: String, default: '' },
    wheelSize: { type: Number, default: 400 },
    slotsCount: { type: Number, default: 6, enum: [4, 6, 8, 10] },
    slots: [wheelSlotSchema],
    pointsPerSpin: { type: Number, default: 100 },
    maxSpinsPerDay: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: '' },
    spinDuration: { type: Number, default: 10 },
    borderColor: { type: String, default: '#3B82F6' },
    evenSlotColor: { type: String, default: '#F7AE14' },
    oddSlotColor: { type: String, default: '#5079F5' },
    pointerColor: { type: String, default: '#EC4899' },
}, { timestamps: true });

export default mongoose.model<IMiniGame>('MiniGame', miniGameSchema);
