"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePromotion = exports.updatePromotion = exports.createPromotion = exports.getPromotions = void 0;
const Promotion_1 = __importDefault(require("../models/Promotion"));
const getPromotions = async (req, res) => {
    try {
        const promotions = await Promotion_1.default.find().populate('applyProductIds buyProductId getProductId', 'name sku').sort({ createdAt: -1 });
        res.json({ success: true, data: promotions });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getPromotions = getPromotions;
const createPromotion = async (req, res) => {
    try {
        const promotion = await Promotion_1.default.create(req.body);
        res.status(201).json({ success: true, data: promotion });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createPromotion = createPromotion;
const updatePromotion = async (req, res) => {
    try {
        const promotion = await Promotion_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('applyProductIds buyProductId getProductId', 'name sku');
        res.json({ success: true, data: promotion });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updatePromotion = updatePromotion;
const deletePromotion = async (req, res) => {
    try {
        await Promotion_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deletePromotion = deletePromotion;
