"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerSpinHistory = exports.spinWheel = exports.exchangePointsForSpins = exports.getActiveMiniGame = exports.resetSlotQuantity = exports.updateRewardStatus = exports.getSpinHistory = exports.toggleMiniGame = exports.upsertMiniGame = exports.getMiniGame = void 0;
const MiniGame_1 = __importDefault(require("../models/MiniGame"));
const SpinHistory_1 = __importDefault(require("../models/SpinHistory"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Gift_1 = __importDefault(require("../models/Gift"));
const Promotion_1 = __importDefault(require("../models/Promotion"));
// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function weightedRandom(slots) {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < slots.length; i++) {
        cumulative += slots[i].probability;
        if (rand < cumulative)
            return i;
    }
    return slots.length - 1;
}
function getTodayStartUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
// ──────────────────────────────────────────────
// ADMIN: Get minigame config
// GET /api/admin/minigame
// ──────────────────────────────────────────────
const getMiniGame = async (req, res) => {
    try {
        const minigame = await MiniGame_1.default.findOne().populate('slots.giftId');
        if (minigame) {
            const originalLength = minigame.slots.length;
            const filteredSlots = minigame.slots.filter(s => s.giftId !== null);
            if (filteredSlots.length !== originalLength) {
                minigame.slots = filteredSlots;
                await MiniGame_1.default.updateOne({ _id: minigame._id }, { $set: { slots: filteredSlots.map(s => ({ giftId: s.giftId._id || s.giftId, color: s.color, probability: s.probability })) } });
            }
        }
        res.json({ success: true, data: minigame || null });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getMiniGame = getMiniGame;
// ──────────────────────────────────────────────
// ADMIN: Create or update minigame config
// POST /api/admin/minigame
// ──────────────────────────────────────────────
const upsertMiniGame = async (req, res) => {
    try {
        const body = req.body;
        // Validate slot probabilities if slots are provided
        if (body.slots && Array.isArray(body.slots) && body.slots.length > 0) {
            const total = body.slots.reduce((sum, s) => sum + Number(s.probability || 0), 0);
            // Allow small floating point tolerance
            if (Math.abs(total - 100) > 0.01) {
                res.status(400).json({
                    success: false,
                    message: `Tổng xác suất các ô phải bằng 100%. Hiện tại: ${total.toFixed(2)}%`
                });
                return;
            }
        }
        let minigame = await MiniGame_1.default.findOne();
        if (!minigame) {
            minigame = await MiniGame_1.default.create(body);
        }
        else {
            Object.assign(minigame, body);
            await minigame.save();
        }
        const populated = await MiniGame_1.default.findById(minigame._id).populate('slots.giftId');
        res.json({ success: true, data: populated });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.upsertMiniGame = upsertMiniGame;
// ──────────────────────────────────────────────
// ADMIN: Toggle isActive
// PUT /api/admin/minigame/toggle
// ──────────────────────────────────────────────
const toggleMiniGame = async (req, res) => {
    try {
        const minigame = await MiniGame_1.default.findOne();
        if (!minigame) {
            res.status(404).json({ success: false, message: 'Chưa có cấu hình MiniGame' });
            return;
        }
        minigame.isActive = !minigame.isActive;
        await minigame.save();
        res.json({ success: true, data: { isActive: minigame.isActive } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.toggleMiniGame = toggleMiniGame;
// ──────────────────────────────────────────────
// ADMIN: Get paginated spin history with stats
// GET /api/admin/minigame/history?page=1&limit=20&prizeType=voucher
// ──────────────────────────────────────────────
const getSpinHistory = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;
        const prizeType = req.query.prizeType;
        const filter = {};
        if (prizeType && ['no_prize', 'normal'].includes(prizeType)) {
            // Map ui filter to DB values if needed, otherwise query directly
            filter.prizeType = prizeType;
        }
        const [records, total, stats] = await Promise.all([
            SpinHistory_1.default.find(filter)
                .populate('customerId', 'name phone email avatar')
                .populate('giftId')
                .sort({ spinAt: -1 })
                .skip(skip)
                .limit(limit),
            SpinHistory_1.default.countDocuments(filter),
            SpinHistory_1.default.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSpins: { $sum: 1 },
                        noPrizeCount: {
                            $sum: { $cond: [{ $eq: ['$prizeType', 'no_prize'] }, 1, 0] }
                        },
                        totalPrizes: {
                            $sum: { $cond: [{ $ne: ['$prizeType', 'no_prize'] }, 1, 0] }
                        }
                    }
                }
            ])
        ]);
        const aggStats = stats[0] || { totalSpins: 0, noPrizeCount: 0, totalPrizes: 0 };
        res.json({
            success: true,
            data: records,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            stats: {
                totalSpins: aggStats.totalSpins,
                totalPrizes: aggStats.totalPrizes,
                noPrizeCount: aggStats.noPrizeCount
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getSpinHistory = getSpinHistory;
// ──────────────────────────────────────────────
// ADMIN: Update reward status for a spin record
// PUT /api/admin/minigame/history/:historyId/reward
// ──────────────────────────────────────────────
const updateRewardStatus = async (req, res) => {
    try {
        const { historyId } = req.params;
        const { rewardStatus, adminNote } = req.body;
        const validStatuses = ['pending', 'contacted', 'delivered', 'cancelled'];
        if (rewardStatus && !validStatuses.includes(rewardStatus)) {
            res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
            return;
        }
        const record = await SpinHistory_1.default.findById(historyId);
        if (!record) {
            res.status(404).json({ success: false, message: 'Không tìm thấy lịch sử quay' });
            return;
        }
        if (rewardStatus)
            record.rewardStatus = rewardStatus;
        if (adminNote !== undefined)
            record.adminNote = adminNote;
        await record.save();
        res.json({ success: true, data: record });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateRewardStatus = updateRewardStatus;
// ──────────────────────────────────────────────
// ADMIN: Reset a gift's quantityRemaining back to quantity
// PUT /api/admin/minigame/gifts/:giftId/reset
// ──────────────────────────────────────────────
const resetSlotQuantity = async (req, res) => {
    try {
        const { giftId } = req.params;
        const gift = await Gift_1.default.findById(giftId);
        if (!gift) {
            res.status(404).json({ success: false, message: 'Không tìm thấy quà tặng' });
            return;
        }
        gift.quantityRemaining = gift.quantity;
        await gift.save();
        res.json({ success: true, data: { giftId, quantityRemaining: gift.quantityRemaining } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.resetSlotQuantity = resetSlotQuantity;
// ──────────────────────────────────────────────
// SHOP: Get active minigame (no probabilities exposed)
// GET /api/shop/minigame/active
// ──────────────────────────────────────────────
const getActiveMiniGame = async (req, res) => {
    try {
        const minigame = await MiniGame_1.default.findOne({ isActive: true }).populate({
            path: 'slots.giftId',
            populate: { path: 'voucherId' }
        });
        if (!minigame) {
            res.json({ success: true, data: null });
            return;
        }
        // Strip probability values to prevent cheating
        const safeSlots = minigame.slots
            .filter((s) => s.giftId !== null)
            .map((s) => {
            const gift = s.giftId;
            const voucher = gift?.voucherId;
            const giftImage = gift?.image || voucher?.image || '';
            return {
                _id: s._id,
                giftId: gift?._id,
                name: gift?.name || '',
                image: giftImage,
                type: gift?.prizeType || 'no_prize',
                color: s.color,
            };
        });
        const safeMinigame = {
            _id: minigame._id,
            name: minigame.name,
            bannerDesktop: minigame.bannerDesktop,
            bannerMobile: minigame.bannerMobile,
            wheelSize: minigame.wheelSize,
            slotsCount: minigame.slotsCount,
            pointsPerSpin: minigame.pointsPerSpin,
            maxSpinsPerDay: minigame.maxSpinsPerDay,
            startDate: minigame.startDate,
            endDate: minigame.endDate,
            description: minigame.description,
            spinDuration: minigame.spinDuration,
            borderColor: minigame.borderColor,
            evenSlotColor: minigame.evenSlotColor,
            oddSlotColor: minigame.oddSlotColor,
            pointerColor: minigame.pointerColor,
            slots: safeSlots,
        };
        // Customer-specific data (if authenticated)
        let spinsRemaining = 0;
        let spinsToday = 0;
        if (req.customer) {
            spinsRemaining = req.customer.spinsRemaining || 0;
            if (minigame.maxSpinsPerDay > 0) {
                const todayStart = getTodayStartUTC();
                spinsToday = await SpinHistory_1.default.countDocuments({
                    customerId: req.customer._id,
                    miniGameId: minigame._id,
                    spinAt: { $gte: todayStart }
                });
            }
        }
        res.json({
            success: true,
            data: {
                minigame: safeMinigame,
                spinsRemaining,
                spinsToday
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getActiveMiniGame = getActiveMiniGame;
// ──────────────────────────────────────────────
// SHOP: Exchange loyalty points for spins
// POST /api/shop/minigame/exchange-points
// ──────────────────────────────────────────────
const exchangePointsForSpins = async (req, res) => {
    try {
        const customer = req.customer;
        if (!customer) {
            res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
            return;
        }
        const quantity = Math.max(1, Number(req.body.quantity) || 1);
        const minigame = await MiniGame_1.default.findOne({ isActive: true });
        if (!minigame) {
            res.status(404).json({ success: false, message: 'MiniGame hiện không hoạt động' });
            return;
        }
        const totalCost = minigame.pointsPerSpin * quantity;
        if ((customer.loyaltyPoints || 0) < totalCost) {
            res.status(400).json({
                success: false,
                message: `Bạn không đủ điểm. Cần ${totalCost.toLocaleString('vi-VN')} điểm, hiện tại bạn có ${(customer.loyaltyPoints || 0).toLocaleString('vi-VN')} điểm.`
            });
            return;
        }
        // Atomically deduct points and add spins
        const updated = await Customer_1.default.findByIdAndUpdate(customer._id, {
            $inc: {
                loyaltyPoints: -totalCost,
                spinsRemaining: quantity
            }
        }, { new: true });
        res.json({
            success: true,
            message: `Đổi thành công ${quantity} lượt quay`,
            data: {
                loyaltyPoints: updated?.loyaltyPoints,
                spinsRemaining: updated?.spinsRemaining
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.exchangePointsForSpins = exchangePointsForSpins;
// ──────────────────────────────────────────────
// SHOP: Spin the wheel
// POST /api/shop/minigame/spin
// ──────────────────────────────────────────────
const spinWheel = async (req, res) => {
    try {
        const customer = req.customer;
        if (!customer) {
            res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
            return;
        }
        // Step 1: Check spinsRemaining > 0
        if ((customer.spinsRemaining || 0) <= 0) {
            res.status(400).json({ success: false, message: 'Bạn không có lượt quay nào. Hãy đổi điểm để lấy lượt quay.' });
            return;
        }
        // Step 2: Get active minigame and populate gift info
        const minigame = await MiniGame_1.default.findOne({ isActive: true }).populate({
            path: 'slots.giftId',
            populate: {
                path: 'voucherId'
            }
        });
        if (!minigame) {
            res.status(404).json({ success: false, message: 'MiniGame hiện không khả dụng' });
            return;
        }
        if (minigame.slots.length === 0) {
            res.status(400).json({ success: false, message: 'MiniGame chưa có cấu hình ô quay' });
            return;
        }
        // Step 3: Check maxSpinsPerDay if set
        if (minigame.maxSpinsPerDay > 0) {
            const todayStart = getTodayStartUTC();
            const spinsToday = await SpinHistory_1.default.countDocuments({
                customerId: customer._id,
                miniGameId: minigame._id,
                spinAt: { $gte: todayStart }
            });
            if (spinsToday >= minigame.maxSpinsPerDay) {
                res.status(400).json({
                    success: false,
                    message: `Bạn đã đạt giới hạn ${minigame.maxSpinsPerDay} lượt quay trong hôm nay`
                });
                return;
            }
        }
        // Step 4: Run weighted random
        let slotIndex = weightedRandom(minigame.slots);
        let isFallback = false;
        let selectedSlot = minigame.slots[slotIndex];
        let gift = selectedSlot.giftId;
        // Step 5: If winning slot's Gift is a prize but out of stock, fallback to first no_prize slot
        if (gift && gift.prizeType !== 'no_prize' && gift.quantityRemaining <= 0) {
            // Find first slot whose Gift is no_prize
            const fallbackIndex = minigame.slots.findIndex((s) => s.giftId?.prizeType === 'no_prize');
            if (fallbackIndex !== -1) {
                slotIndex = fallbackIndex;
                selectedSlot = minigame.slots[fallbackIndex];
                gift = selectedSlot.giftId;
                isFallback = true;
            }
        }
        // Step 6: Atomically decrement spinsRemaining on Customer
        const customerUpdate = {
            $inc: { spinsRemaining: -1, totalSpins: 1 },
            $set: { lastSpinAt: new Date() }
        };
        let generatedVoucherCode = undefined;
        if (gift && gift.voucherId) {
            let templatePromo = gift.voucherId;
            if (typeof templatePromo !== 'object' || !templatePromo.code) {
                templatePromo = await Promotion_1.default.findById(gift.voucherId);
            }
            if (templatePromo) {
                // Generate a unique voucher code suffix for each win
                const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
                generatedVoucherCode = `${templatePromo.code}-${randomSuffix}`;
                // Calculate expiry date if gift specifies expiryDays
                let endDate = templatePromo.endDate;
                if (gift.expiryDays && gift.expiryDays > 0) {
                    endDate = new Date(Date.now() + gift.expiryDays * 24 * 60 * 60 * 1000);
                }
                // Create a unique personal Promotion document for this customer win
                const userVoucher = await Promotion_1.default.create({
                    code: generatedVoucherCode,
                    name: templatePromo.name,
                    description: templatePromo.description || `Mã quà tặng từ MiniGame`,
                    image: templatePromo.image || gift.image || '',
                    type: templatePromo.type,
                    value: templatePromo.value,
                    minOrderValue: templatePromo.minOrderValue || 0,
                    startDate: new Date(),
                    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    status: 'active',
                    applyType: templatePromo.applyType || 'order',
                    applyProductIds: templatePromo.applyProductIds || [],
                    buyProductId: templatePromo.buyProductId,
                    buyQty: templatePromo.buyQty || 1,
                    getProductId: templatePromo.getProductId,
                    discountYValue: templatePromo.discountYValue || 0,
                    usageLimit: 1, // Single-use per generated code
                    limitPerUser: 1,
                    usedCount: 0,
                    isVisible: false // Hidden from public
                });
                customerUpdate.$push = { vouchers: userVoucher._id };
            }
        }
        const updatedCustomer = await Customer_1.default.findByIdAndUpdate(customer._id, customerUpdate, { new: true });
        if (!updatedCustomer) {
            res.status(500).json({ success: false, message: 'Lỗi cập nhật thông tin khách hàng' });
            return;
        }
        // Step 7: Decrement quantityRemaining and increment claimedCount for Gift (if not no_prize)
        if (gift && gift.prizeType !== 'no_prize') {
            await Gift_1.default.updateOne({ _id: gift._id }, { $inc: { quantityRemaining: -1, claimedCount: 1 } });
        }
        // Step 8: Build prize details
        const giftName = gift?.name || 'Phần quà';
        const giftType = gift?.prizeType || 'no_prize';
        const finalVoucherCode = generatedVoucherCode || (gift?.voucherId && (typeof gift.voucherId === 'object') ? gift.voucherId.code : undefined);
        const prizeDescription = giftType === 'no_prize'
            ? 'Chúc bạn may mắn lần sau!'
            : finalVoucherCode
                ? `🎉 Bạn đã nhận được Voucher: ${giftName} (Mã: ${finalVoucherCode})`
                : `🎉 Bạn đã trúng: ${giftName}`;
        // Step 9: Create SpinHistory record
        await SpinHistory_1.default.create({
            customerId: customer._id,
            miniGameId: minigame._id,
            giftId: gift?._id,
            slotIndex,
            slotName: giftName,
            prizeType: giftType,
            prizeDescription,
            isFallback,
            pointsSpent: 0,
            spinAt: new Date(),
            rewardStatus: giftType === 'no_prize' ? 'cancelled' : 'pending',
        });
        res.json({
            success: true,
            data: {
                slotIndex,
                slotName: giftName,
                prizeType: giftType,
                prizeDescription,
                isFallback,
                voucherCode: finalVoucherCode,
                spinsRemaining: updatedCustomer.spinsRemaining
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.spinWheel = spinWheel;
// ──────────────────────────────────────────────
// SHOP: Get own spin history (paginated)
// GET /api/shop/minigame/history?page=1&limit=10
// ──────────────────────────────────────────────
const getCustomerSpinHistory = async (req, res) => {
    try {
        const customer = req.customer;
        if (!customer) {
            res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
            return;
        }
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;
        const [records, total] = await Promise.all([
            SpinHistory_1.default.find({ customerId: customer._id })
                .populate('giftId')
                .sort({ spinAt: -1 })
                .skip(skip)
                .limit(limit),
            SpinHistory_1.default.countDocuments({ customerId: customer._id })
        ]);
        res.json({
            success: true,
            data: records,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getCustomerSpinHistory = getCustomerSpinHistory;
