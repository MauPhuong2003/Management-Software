"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFlashSale = exports.updateFlashSale = exports.createFlashSale = exports.getFlashSales = void 0;
const FlashSale_1 = __importDefault(require("../models/FlashSale"));
const getFlashSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const flashSales = await FlashSale_1.default.find()
            .populate('products.product')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await FlashSale_1.default.countDocuments();
        res.json({
            success: true,
            data: flashSales,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getFlashSales = getFlashSales;
const createFlashSale = async (req, res) => {
    try {
        const flashSale = await FlashSale_1.default.create(req.body);
        res.status(201).json({ success: true, data: flashSale });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};
exports.createFlashSale = createFlashSale;
const updateFlashSale = async (req, res) => {
    try {
        const flashSale = await FlashSale_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!flashSale) {
            res.status(404).json({ success: false, message: 'Không tìm thấy chiến dịch Flash Sale này' });
            return;
        }
        res.json({ success: true, data: flashSale });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};
exports.updateFlashSale = updateFlashSale;
const deleteFlashSale = async (req, res) => {
    try {
        const flashSale = await FlashSale_1.default.findByIdAndDelete(req.params.id);
        if (!flashSale) {
            res.status(404).json({ success: false, message: 'Không tìm thấy chiến dịch Flash Sale này' });
            return;
        }
        res.json({ success: true, message: 'Đã xóa chiến dịch Flash Sale thành công' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deleteFlashSale = deleteFlashSale;
