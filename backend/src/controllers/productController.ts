import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import { syncProductsStock } from './warehouseController';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        // Sync warehouse stocks in background
        syncProductsStock().catch(err => console.error('Background sync failed:', err));

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Bộ lọc filter
        const filter: any = {};
        if (req.query.isFeatured) {
            filter.isFeatured = req.query.isFeatured === 'true';
        }

        // Sắp xếp sort
        let sortOption: any = { createdAt: -1 };
        if (req.query.sort) {
            const sortField = req.query.sort as string;
            if (sortField.startsWith('-')) {
                sortOption = { [sortField.slice(1)]: -1 };
            } else {
                sortOption = { [sortField]: 1 };
            }
        }

        const products = await Product.find(filter)
            .populate('categoryIds', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            data: products,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) { res.status(404).json({ success: false, message: 'Not found' }); return; }
        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const bulkImportProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const productsList = req.body;
        if (!Array.isArray(productsList)) {
            res.status(400).json({ success: false, message: 'Dữ liệu không đúng định dạng (phải là danh sách sản phẩm)' });
            return;
        }

        const importedProducts = [];
        const errors = [];

        for (let i = 0; i < productsList.length; i++) {
            const item = productsList[i];
            try {
                if (!item.name || !item.sku || item.priceSale === undefined) {
                    errors.push({ index: i, sku: item.sku || 'N/A', error: 'Thiếu thông tin bắt buộc (Tên, SKU, hoặc Giá bán)' });
                    continue;
                }

                // Check if SKU exists
                const existingProduct = await Product.findOne({ sku: item.sku.trim() });
                if (existingProduct) {
                    errors.push({ index: i, sku: item.sku, error: `Mã SKU "${item.sku}" đã tồn tại` });
                    continue;
                }

                // Map category names to ObjectIds (create category if not exists)
                const categoryIds = [];
                if (item.categoryNames && Array.isArray(item.categoryNames)) {
                    for (const catName of item.categoryNames) {
                        if (!catName || catName.trim() === '') continue;
                        let category = await Category.findOne({ name: catName.trim() });
                        if (!category) {
                            category = await Category.create({ 
                                name: catName.trim()
                            });
                        }
                        categoryIds.push(category._id);
                    }
                }

                // Build default variant if stock is set
                const defaultVariant = {
                    sku: item.sku.trim(),
                    price: Number(item.priceSale),
                    priceCompare: Number(item.priceCompare || 0),
                    stock: Number(item.stock || 0),
                    barcode: '',
                    weight: 0,
                    status: 'active' as const,
                    image: item.images && item.images.length > 0 ? item.images[0] : '',
                    attributes: []
                };

                const productData = {
                    name: item.name.trim(),
                    sku: item.sku.trim(),
                    description: item.description || '',
                    priceSale: Number(item.priceSale),
                    priceCompare: Number(item.priceCompare || 0),
                    images: item.images || [],
                    categoryIds,
                    status: 'active' as const,
                    variants: [defaultVariant]
                };

                const product = await Product.create(productData);
                importedProducts.push(product);
            } catch (err: any) {
                errors.push({ index: i, sku: item.sku || 'N/A', error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            summary: {
                total: productsList.length,
                success: importedProducts.length,
                failed: errors.length
            },
            importedProducts,
            errors
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
