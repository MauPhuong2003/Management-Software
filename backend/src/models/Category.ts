import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    image: string;
    parentId: mongoose.Types.ObjectId | null;
    status: 'active' | 'inactive';
}

const categorySchema = new Schema<ICategory>({
    name: { type: String, required: true },
    image: { type: String, default: '' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export default mongoose.model<ICategory>('Category', categorySchema);
