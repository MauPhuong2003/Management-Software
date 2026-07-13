"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const variantSchema = new mongoose_1.Schema({
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
const productSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    priceSale: { type: Number, required: true },
    priceCompare: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    categoryIds: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Category' }],
    isFeatured: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0 },
    variants: [variantSchema]
}, { timestamps: true });
exports.default = mongoose_1.default.model('Product', productSchema);
