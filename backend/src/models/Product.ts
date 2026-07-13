import mongoose, { Document, Schema } from 'mongoose';

export interface IProductVariant {
    sku: string;
    price: number;
    priceCompare: number;
    stock: number;
    barcode: string;
    weight: number;
    status: 'active' | 'inactive';
    image: string;
    attributes: { key: string; value: string }[];
}

export interface IProduct extends Document {
    name: string;
    sku: string;
    description: string;
    images: string[];
    priceSale: number;
    priceCompare: number;
    status: 'active' | 'inactive';
    categoryIds: mongoose.Types.ObjectId[];
    isFeatured: boolean;
    soldCount: number;
    variants: IProductVariant[];
}

const variantSchema = new Schema<IProductVariant>({
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    priceCompare: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    barcode: { type: String, default: '' },
    weight: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    image: { type: String, default: '' },
    attributes: [{
        key: { type: String, required: true },
        value: { type: String, required: true }
    }]
});

const productSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    priceSale: { type: Number, required: true },
    priceCompare: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    isFeatured: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0 },
    variants: [variantSchema]
}, { timestamps: true });

export default mongoose.model<IProduct>('Product', productSchema);
