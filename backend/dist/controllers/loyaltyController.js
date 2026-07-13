"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillLoyaltyPoints = exports.adjustCustomerPoints = exports.recalculateAllTiers = exports.updateLoyaltyConfig = exports.getLoyaltyConfig = exports.awardLoyaltyPoints = exports.getTierForPoints = void 0;
const LoyaltyConfig_1 = __importDefault(require("../models/LoyaltyConfig"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Order_1 = __importDefault(require("../models/Order"));
// Helper: determine tier name from points and config tiers (prevent downgrade if current tier is higher)
const getTierForPoints = (points, tiers, currentTierName) => {
    const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
    const matched = sorted.find(t => points >= t.minPoints && t.isActive !== false);
    const matchedName = matched ? matched.name : (tiers.find(t => t.minPoints === 0)?.name || 'Đồng');
    if (currentTierName) {
        const currentTierConfig = tiers.find(t => t.name === currentTierName);
        const matchedTierConfig = tiers.find(t => t.name === matchedName);
        if (currentTierConfig && matchedTierConfig) {
            // Keep current tier if the newly calculated tier has lower minPoints threshold
            if (matchedTierConfig.minPoints < currentTierConfig.minPoints) {
                return currentTierName;
            }
        }
    }
    return matchedName;
};
exports.getTierForPoints = getTierForPoints;
// Award loyalty points to a customer after a paid order
const awardLoyaltyPoints = async (customerId, orderAmount, orderSource) => {
    try {
        const config = await LoyaltyConfig_1.default.findOne();
        if (!config || !config.isActive)
            return;
        // Check if order source matches config
        if (config.applyToOrders !== 'all') {
            if (config.applyToOrders === 'pos' && orderSource !== 'pos')
                return;
            if (config.applyToOrders === 'website' && orderSource !== 'website')
                return;
        }
        const customer = await Customer_1.default.findById(customerId);
        if (!customer)
            return;
        // Find current tier multiplier
        const currentTier = config.tiers.find(t => t.name === customer.tier);
        const multiplier = currentTier?.pointMultiplier || 1;
        // Calculate points: orderAmount / vndToEarnOnePoint * multiplier
        const vndToEarn = config.vndToEarnOnePoint || 100000;
        const pointsEarned = Math.floor((orderAmount / vndToEarn) * multiplier);
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
        customer.totalSpent = (customer.totalSpent || 0) + orderAmount;
        // Recalculate tier (prevent downgrade)
        customer.tier = (0, exports.getTierForPoints)(customer.loyaltyPoints, config.tiers, customer.tier);
        await customer.save();
    }
    catch (err) {
        console.error('Error awarding loyalty points:', err);
    }
};
exports.awardLoyaltyPoints = awardLoyaltyPoints;
// GET /loyalty/config  — returns config + member count per tier
const getLoyaltyConfig = async (req, res) => {
    try {
        let config = await LoyaltyConfig_1.default.findOne();
        if (!config)
            config = await LoyaltyConfig_1.default.create({});
        // Auto-migrate database configurations if they contain the old name "Thành viên mới"
        let configUpdated = false;
        if (config.tiers && config.tiers.length > 0) {
            config.tiers.forEach(t => {
                if (t.name === 'Thành viên mới') {
                    t.name = 'Đồng';
                    configUpdated = true;
                }
                if (t.name === 'Thành viên Bạc') {
                    t.name = 'Bạc';
                    configUpdated = true;
                }
                if (t.name === 'Thành viên Vàng') {
                    t.name = 'Vàng';
                    configUpdated = true;
                }
                if (t.name === 'Thành viên Kim Cương') {
                    t.name = 'Kim Cương';
                    configUpdated = true;
                }
            });
            if (configUpdated) {
                await config.save();
                // Also update any customers pointing to the old tier names
                await Customer_1.default.updateMany({ tier: 'Thành viên mới' }, { $set: { tier: 'Đồng' } });
                await Customer_1.default.updateMany({ tier: 'Thành viên Bạc' }, { $set: { tier: 'Bạc' } });
                await Customer_1.default.updateMany({ tier: 'Thành viên Vàng' }, { $set: { tier: 'Vàng' } });
                await Customer_1.default.updateMany({ tier: 'Thành viên Kim Cương' }, { $set: { tier: 'Kim Cương' } });
            }
        }
        // Ensure any customers without any tier, or empty/null tier are assigned to the lowest active tier
        const lowestActiveTier = config.tiers.find(t => t.isActive !== false)?.name || 'Đồng';
        await Customer_1.default.updateMany({ $or: [{ tier: { $exists: false } }, { tier: null }, { tier: '' }] }, { $set: { tier: lowestActiveTier } });
        // Count members per tier
        const tierCounts = await Customer_1.default.aggregate([
            { $group: { _id: '$tier', count: { $sum: 1 } } }
        ]);
        const tierCountMap = {};
        tierCounts.forEach(t => {
            if (t._id)
                tierCountMap[t._id] = t.count;
        });
        const tiersWithCount = config.tiers.map(t => ({
            ...t.toObject?.() ?? t,
            memberCount: tierCountMap[t.name] || 0
        }));
        res.json({ success: true, data: { ...config.toObject(), tiers: tiersWithCount } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getLoyaltyConfig = getLoyaltyConfig;
// PUT /loyalty/config
const updateLoyaltyConfig = async (req, res) => {
    try {
        let config = await LoyaltyConfig_1.default.findOne();
        if (!config) {
            config = await LoyaltyConfig_1.default.create(req.body);
        }
        else {
            Object.assign(config, req.body);
            await config.save();
        }
        res.json({ success: true, data: config });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateLoyaltyConfig = updateLoyaltyConfig;
// POST /loyalty/recalculate
const recalculateAllTiers = async (req, res) => {
    try {
        const config = await LoyaltyConfig_1.default.findOne();
        if (!config) {
            res.status(404).json({ success: false, message: 'Chưa có cấu hình loyalty' });
            return;
        }
        const customers = await Customer_1.default.find();
        let updated = 0;
        for (const customer of customers) {
            const newTier = (0, exports.getTierForPoints)(customer.loyaltyPoints || 0, config.tiers, customer.tier);
            if (customer.tier !== newTier) {
                customer.tier = newTier;
                await customer.save();
                updated++;
            }
        }
        res.json({ success: true, message: `Đã cập nhật hạng cho ${updated} khách hàng` });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.recalculateAllTiers = recalculateAllTiers;
// POST /loyalty/adjust/:customerId
const adjustCustomerPoints = async (req, res) => {
    try {
        const { points } = req.body;
        const customer = await Customer_1.default.findById(req.params.customerId);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
            return;
        }
        const config = await LoyaltyConfig_1.default.findOne();
        customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) + Number(points));
        if (config)
            customer.tier = (0, exports.getTierForPoints)(customer.loyaltyPoints, config.tiers, customer.tier);
        await customer.save();
        res.json({ success: true, data: customer });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.adjustCustomerPoints = adjustCustomerPoints;
// POST /loyalty/backfill — award points for all eligible unprocessed paid orders
const backfillLoyaltyPoints = async (req, res) => {
    try {
        const config = await LoyaltyConfig_1.default.findOne();
        if (!config) {
            res.status(404).json({ success: false, message: 'Chưa có cấu hình loyalty' });
            return;
        }
        // Fetch all paid orders with a customer that haven't been awarded yet
        const eligibleOrders = await Order_1.default.find({
            paymentStatus: 'paid',
            customer: { $ne: null },
            loyaltyAwarded: { $ne: true }
        }).lean();
        let processedCount = 0;
        let skippedCount = 0;
        let totalPointsAwarded = 0;
        const details = [];
        for (const order of eligibleOrders) {
            // Check applyToOrders filter
            const src = order.orderSource || 'website';
            if (config.applyToOrders !== 'all') {
                if (config.applyToOrders === 'pos' && src !== 'pos') {
                    skippedCount++;
                    continue;
                }
                if (config.applyToOrders === 'website' && src !== 'website') {
                    skippedCount++;
                    continue;
                }
            }
            const customer = await Customer_1.default.findById(order.customer);
            if (!customer) {
                skippedCount++;
                continue;
            }
            // Get tier multiplier BEFORE awarding (current tier)
            const currentTier = config.tiers.find(t => t.name === customer.tier);
            const multiplier = currentTier?.pointMultiplier || 1;
            const vndToEarn = config.vndToEarnOnePoint || 100000;
            const pointsEarned = Math.floor((order.totalAmount / vndToEarn) * multiplier);
            customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
            customer.totalSpent = (customer.totalSpent || 0) + order.totalAmount;
            customer.tier = (0, exports.getTierForPoints)(customer.loyaltyPoints, config.tiers, customer.tier);
            await customer.save();
            // Mark order as processed
            await Order_1.default.findByIdAndUpdate(order._id, { loyaltyAwarded: true });
            totalPointsAwarded += pointsEarned;
            processedCount++;
            details.push({
                orderCode: order.orderCode,
                customerName: customer.name,
                orderAmount: order.totalAmount,
                pointsAwarded: pointsEarned,
                newTier: customer.tier
            });
        }
        res.json({
            success: true,
            summary: {
                totalEligibleOrders: eligibleOrders.length,
                processed: processedCount,
                skipped: skippedCount,
                totalPointsAwarded
            },
            details
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.backfillLoyaltyPoints = backfillLoyaltyPoints;
