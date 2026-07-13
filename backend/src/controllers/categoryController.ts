import { Request, Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (req.query.search) {
            filter.name = { $regex: req.query.search, $options: 'i' };
        }

        const categories = await Category.find(filter).populate('parentId', 'name').skip(skip).limit(limit).sort({ createdAt: -1 });
        const total = await Category.countDocuments(filter);

        res.json({
            success: true,
            data: categories,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productIds, ...categoryData } = req.body;
        const category = await Category.create(categoryData);

        if (productIds && Array.isArray(productIds)) {
            await Product.updateMany(
                { _id: { $in: productIds } },
                { $set: { categoryIds: [category._id] } }
            );
        }

        res.status(201).json({ success: true, data: category });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productIds, ...categoryData } = req.body;
        const category = await Category.findByIdAndUpdate(req.params.id, categoryData, { new: true, runValidators: true });
        if (!category) {
            res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
            return;
        }

        if (productIds && Array.isArray(productIds)) {
            // Clear category reference from products previously in this category
            await Product.updateMany(
                { categoryIds: category._id },
                { $set: { categoryIds: [] } }
            );
            // Set categoryIds to [category._id] for the newly selected products
            await Product.updateMany(
                { _id: { $in: productIds } },
                { $set: { categoryIds: [category._id] } }
            );
        }

        res.json({ success: true, data: category });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
            return;
        }

        // Clear category reference from all products belonging to it
        await Product.updateMany(
            { categoryIds: category._id },
            { $set: { categoryIds: [] } }
        );

        res.json({ success: true, message: 'Xoá danh mục thành công' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
