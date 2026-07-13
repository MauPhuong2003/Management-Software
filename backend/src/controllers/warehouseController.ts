import { Request, Response } from 'express';
import Warehouse from '../models/Warehouse';
import Product from '../models/Product';

export const syncProductsStock = async (): Promise<void> => {
    try {
        const warehouses = await Warehouse.find({ status: 'active' });
        const skuStockMap: Record<string, number> = {};

        for (const wh of warehouses) {
            for (const item of wh.products) {
                if (item.variantSku) {
                    skuStockMap[item.variantSku] = (skuStockMap[item.variantSku] || 0) + item.stock;
                }
            }
        }

        const products = await Product.find();
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
    } catch (err) {
        console.error('Error syncing warehouse stocks to products:', err);
    }
};

export const getWarehouses = async (req: Request, res: Response): Promise<void> => {
    try {
        const warehouses = await Warehouse.find().populate('products.productId', 'name images variants').sort({ createdAt: -1 });
        res.json({ success: true, data: warehouses });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
        const warehouse = await Warehouse.create(req.body);
        await syncProductsStock();
        res.status(201).json({ success: true, data: warehouse });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
        const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('products.productId', 'name images variants');
        await syncProductsStock();
        res.json({ success: true, data: warehouse });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
        await Warehouse.findByIdAndDelete(req.params.id);
        await syncProductsStock();
        res.json({ success: true, message: 'Deleted' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};
