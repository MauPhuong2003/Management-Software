"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
const warehouseController_1 = require("./warehouseController");
const getProducts = async (req, res) => {
    try {
        // Sync warehouse stocks in background
        (0, warehouseController_1.syncProductsStock)().catch(err => console.error('Background sync failed:', err));
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Bộ lọc filter
        const filter = {};
        if (req.query.isFeatured) {
            filter.isFeatured = req.query.isFeatured === 'true';
        }
        // Sắp xếp sort
        let sortOption = { createdAt: -1 };
        if (req.query.sort) {
            const sortField = req.query.sort;
            if (sortField.startsWith('-')) {
                sortOption = { [sortField.slice(1)]: -1 };
            }
            else {
                sortOption = { [sortField]: 1 };
            }
        }
        const products = await Product_1.default.find(filter)
            .populate('categoryIds', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);
        const total = await Product_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: products,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProducts = getProducts;
const createProduct = async (req, res) => {
    try {
        const product = await Product_1.default.create(req.body);
        res.status(201).json({ success: true, data: product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const product = await Product_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) {
            res.status(404).json({ success: false, message: 'Not found' });
            return;
        }
        res.json({ success: true, data: product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        await Product_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteProduct = deleteProduct;
const bulkImportProducts = async (req, res) => {
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
                const existingProduct = await Product_1.default.findOne({ sku: item.sku.trim() });
                if (existingProduct) {
                    errors.push({ index: i, sku: item.sku, error: `Mã SKU "${item.sku}" đã tồn tại` });
                    continue;
                }
                // Map category names to ObjectIds (create category if not exists)
                const categoryIds = [];
                if (item.categoryNames && Array.isArray(item.categoryNames)) {
                    for (const catName of item.categoryNames) {
                        if (!catName || catName.trim() === '')
                            continue;
                        let category = await Category_1.default.findOne({ name: catName.trim() });
                        if (!category) {
                            category = await Category_1.default.create({
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
                    status: 'active',
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
                    status: 'active',
                    variants: [defaultVariant]
                };
                const product = await Product_1.default.create(productData);
                importedProducts.push(product);
            }
            catch (err) {
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.bulkImportProducts = bulkImportProducts;
