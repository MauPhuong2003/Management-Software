import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
    storeName: string;
    logo: string;
    banners: string[];
    contact: {
        phone: string;
        email: string;
        facebook: string;
    };
    addresses: {
        branchName: string;
        address: string;
        openingHours: string;
        lat?: number;
        lon?: number;
    }[];
    bankInfo?: {
        bankName: string;
        accountHolder: string;
        accountNumber: string;
    } | null;
}

const settingSchema = new Schema<ISetting>({
    storeName: { type: String, required: true, default: 'My SaaS Store' },
    logo: { type: String, default: '' },
    banners: [{ type: String }],
    contact: {
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        facebook: { type: String, default: '' }
    },
    addresses: [{
        branchName: String,
        address: String,
        openingHours: String,
        lat: Number,
        lon: Number
    }],
    bankInfo: {
        bankName: { type: String, default: '' },
        accountHolder: { type: String, default: '' },
        accountNumber: { type: String, default: '' }
    }
}, { timestamps: true });

export default mongoose.model<ISetting>('Setting', settingSchema);
