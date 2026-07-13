import mongoose, { Document, Schema } from 'mongoose';

export interface IWarehouseProduct {
    productId: mongoose.Types.ObjectId;
    variantSku: string;
    stock: number;
}

export interface IWarehouse extends Document {
    name: string;
    code: string;
    address: string;
    phone: string;
    status: 'active' | 'inactive';
    products: IWarehouseProduct[];
}

const warehouseSchema = new Schema<IWarehouse>({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variantSku: { type: String, required: true },
        stock: { type: Number, required: true, default: 0 }
    }]
}, { timestamps: true });

export default mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
