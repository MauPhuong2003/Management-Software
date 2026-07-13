"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const Product_1 = __importDefault(require("../models/Product"));
const getCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.search) {
            filter.name = { $regex: req.query.search, $options: 'i' };
        }
        const categories = await Category_1.default.find(filter).populate('parentId', 'name').skip(skip).limit(limit).sort({ createdAt: -1 });
        const total = await Category_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: categories,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCategories = getCategories;
const createCategory = async (req, res) => {
    try {
        const { productIds, ...categoryData } = req.body;
        const category = await Category_1.default.create(categoryData);
        if (productIds && Array.isArray(productIds)) {
            await Product_1.default.updateMany({ _id: { $in: productIds } }, { $set: { categoryIds: [category._id] } });
        }
        res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const { productIds, ...categoryData } = req.body;
        const category = await Category_1.default.findByIdAndUpdate(req.params.id, categoryData, { new: true, runValidators: true });
        if (!category) {
            res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
            return;
        }
        if (productIds && Array.isArray(productIds)) {
            // Clear category reference from products previously in this category
            await Product_1.default.updateMany({ categoryIds: category._id }, { $set: { categoryIds: [] } });
            // Set categoryIds to [category._id] for the newly selected products
            await Product_1.default.updateMany({ _id: { $in: productIds } }, { $set: { categoryIds: [category._id] } });
        }
        res.json({ success: true, data: category });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
            return;
        }
        // Clear category reference from all products belonging to it
        await Product_1.default.updateMany({ categoryIds: category._id }, { $set: { categoryIds: [] } });
        res.json({ success: true, message: 'Xoá danh mục thành công' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCategory = deleteCategory;
