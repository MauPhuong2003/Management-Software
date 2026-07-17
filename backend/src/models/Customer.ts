import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerAddress {
    label?: string;
    addressType?: string; // "Trước sáp nhập" or "Sau sáp nhập"
    name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    detail: string;
    isDefault: boolean;
}

export interface ICustomer extends Document {
    name: string;
    phone: string;
    address: string;
    gender: string;
    tags: mongoose.Types.ObjectId[];
    loyaltyPoints: number;
    tier: string;
    totalSpent: number;
    email?: string;
    password?: string;
    avatar?: string;
    otpCode?: string;
    otpExpireTime?: Date;
    addresses?: ICustomerAddress[];
    spinsRemaining: number;
    totalSpins: number;
    lastSpinAt?: Date;
    vouchers: mongoose.Types.ObjectId[];
}

const customerAddressSchema = new Schema<ICustomerAddress>({
    label: { type: String, default: '' },
    addressType: { type: String, default: 'Sau sáp nhập' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    ward: { type: String, required: true },
    detail: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
});

const customerSchema = new Schema<ICustomer>({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    gender: { type: String, default: 'other' },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerTag' }],
    loyaltyPoints: { type: Number, default: 0 },
    tier: { type: String, default: 'Đồng' },
    totalSpent: { type: Number, default: 0 },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    avatar: { type: String, default: '' },
    otpCode: { type: String },
    otpExpireTime: { type: Date },
    addresses: [customerAddressSchema],
    spinsRemaining: { type: Number, default: 0 },
    totalSpins: { type: Number, default: 0 },
    lastSpinAt: { type: Date },
    vouchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' }]
}, { timestamps: true });

export default mongoose.model<ICustomer>('Customer', customerSchema);
