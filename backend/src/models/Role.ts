import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
    name: string;
    description: string;
    permissions: string[]; // e.g., ['manage_users', 'manage_orders', 'view_dashboard']
}

const roleSchema = new Schema<IRole>({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }]
}, { timestamps: true });

export default mongoose.model<IRole>('Role', roleSchema);
