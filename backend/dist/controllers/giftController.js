"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGift = exports.updateGift = exports.createGift = exports.getGifts = void 0;
const Gift_1 = __importDefault(require("../models/Gift"));
const MiniGame_1 = __importDefault(require("../models/MiniGame"));
// Get list of gifts (with pagination & search)
const getGifts = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 100);
        const search = req.query.search;
        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        const [records, total] = await Promise.all([
            Gift_1.default.find(filter)
                .populate('voucherId')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Gift_1.default.countDocuments(filter)
        ]);
        res.json({
            success: true,
            data: records,
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
exports.getGifts = getGifts;
// Create a new gift
const createGift = async (req, res) => {
    try {
        const { name, image, quantity, prizeType, receiveMethod, expiryDays, voucherId } = req.body;
        const newGift = new Gift_1.default({
            name,
            image,
            quantity: Number(quantity) || 0,
            quantityRemaining: Number(quantity) || 0,
            prizeType,
            receiveMethod,
            expiryDays: Number(expiryDays) || 0,
            voucherId: voucherId || undefined
        });
        await newGift.save();
        res.json({ success: true, data: newGift });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createGift = createGift;
// Update a gift
const updateGift = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image, quantity, prizeType, receiveMethod, expiryDays, voucherId } = req.body;
        const gift = await Gift_1.default.findById(id);
        if (!gift) {
            res.status(404).json({ success: false, message: 'Không tìm thấy quà tặng' });
            return;
        }
        if (quantity !== undefined) {
            const newQty = Number(quantity) || 0;
            const oldQty = gift.quantity;
            const diff = newQty - oldQty;
            // Adjust remaining by the delta
            gift.quantityRemaining = Math.max(0, gift.quantityRemaining + diff);
            gift.quantity = newQty;
        }
        if (name !== undefined)
            gift.name = name;
        if (image !== undefined)
            gift.image = image;
        if (prizeType !== undefined)
            gift.prizeType = prizeType;
        if (receiveMethod !== undefined)
            gift.receiveMethod = receiveMethod;
        if (expiryDays !== undefined)
            gift.expiryDays = Number(expiryDays) || 0;
        if (voucherId !== undefined) {
            gift.voucherId = voucherId ? voucherId : undefined;
        }
        await gift.save();
        res.json({ success: true, data: gift });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateGift = updateGift;
// Delete a gift
const deleteGift = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if gift is in use in the MiniGame wheel configuration
        const minigameInUse = await MiniGame_1.default.findOne({ 'slots.giftId': id });
        if (minigameInUse) {
            res.status(400).json({
                success: false,
                message: 'Quà tặng này đang được gán trên ô của Vòng Quay May Mắn. Không thể xóa!'
            });
            return;
        }
        const gift = await Gift_1.default.findByIdAndDelete(id);
        if (!gift) {
            res.status(404).json({ success: false, message: 'Không tìm thấy quà tặng' });
            return;
        }
        res.json({ success: true, message: 'Xóa quà tặng thành công!' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deleteGift = deleteGift;
