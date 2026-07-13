"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWarehouse = exports.updateWarehouse = exports.createWarehouse = exports.getWarehouses = exports.syncProductsStock = void 0;
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
const Product_1 = __importDefault(require("../models/Product"));
const syncProductsStock = async () => {
    try {
        const warehouses = await Warehouse_1.default.find({ status: 'active' });
        const skuStockMap = {};
        for (const wh of warehouses) {
            for (const item of wh.products) {
                if (item.variantSku) {
                    skuStockMap[item.variantSku] = (skuStockMap[item.variantSku] || 0) + item.stock;
                }
            }
        }
        const products = await Product_1.default.find();
        for (const product of products) {
            let isUpdated = false;
            for (const variant of product.variants) {
                const expectedStock = skuStockMap[variant.sku] || 0;
                if (variant.stock !== expectedStock) {
                    variant.stock = expectedStock;
                    isUpdated = true;
                }
            }
            if (isUpdated) {
                product.markModified('variants');
                await product.save();
            }
        }
    }
    catch (err) {
        console.error('Error syncing warehouse stocks to products:', err);
    }
};
exports.syncProductsStock = syncProductsStock;
const getWarehouses = async (req, res) => {
    try {
        const warehouses = await Warehouse_1.default.find().populate('products.productId', 'name images variants').sort({ createdAt: -1 });
        res.json({ success: true, data: warehouses });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getWarehouses = getWarehouses;
const createWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse_1.default.create(req.body);
        await (0, exports.syncProductsStock)();
        res.status(201).json({ success: true, data: warehouse });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createWarehouse = createWarehouse;
const updateWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('products.productId', 'name images variants');
        await (0, exports.syncProductsStock)();
        res.json({ success: true, data: warehouse });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateWarehouse = updateWarehouse;
const deleteWarehouse = async (req, res) => {
    try {
        await Warehouse_1.default.findByIdAndDelete(req.params.id);
        await (0, exports.syncProductsStock)();
        res.json({ success: true, message: 'Deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteWarehouse = deleteWarehouse;
