import { Request, Response } from 'express';
import LoyaltyConfig from '../models/LoyaltyConfig';
import Customer from '../models/Customer';
import Order from '../models/Order';
import PointHistory from '../models/PointHistory';

// Helper: determine tier name from points and config tiers (prevent downgrade if current tier is higher)
export const getTierForPoints = (points: number, tiers: any[], currentTierName?: string): string => {
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

// Award loyalty points to a customer after a paid order
export const awardLoyaltyPoints = async (
    customerId: string,
    orderAmount: number,
    orderSource?: string,
    orderId?: string
): Promise<void> => {
    try {
        const config = await LoyaltyConfig.findOne();
        if (!config || !config.isActive) return;

        // Check if order source matches config
        if (config.applyToOrders !== 'all') {
            if (config.applyToOrders === 'pos' && orderSource !== 'pos') return;
            if (config.applyToOrders === 'website' && orderSource !== 'website') return;
        }

        const customer = await Customer.findById(customerId);
        if (!customer) return;

        // Find current tier multiplier
        const currentTier = config.tiers.find(t => t.name === customer.tier);
        const multiplier = currentTier?.pointMultiplier || 1;

        // Calculate points: orderAmount / vndToEarn onePoint * multiplier
        const vndToEarn = config.vndToEarnOnePoint || 100000;
        const pointsEarned = Math.floor((orderAmount / vndToEarn) * multiplier);

        if (pointsEarned > 0) {
            customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
            customer.totalSpent = (customer.totalSpent || 0) + orderAmount;

            // Recalculate tier (prevent downgrade)
            customer.tier = getTierForPoints(customer.loyaltyPoints, config.tiers as any[], customer.tier);
            await customer.save();

            // Create point history entry
            await PointHistory.create({
                customer: customer._id,
                order: orderId || null,
                points: pointsEarned,
                type: 'earn',
                reason: `Tích lũy từ đơn hàng ${orderSource === 'pos' ? 'POS' : 'Website'}`
            });
        }
    } catch (err) {
        console.error('Error awarding loyalty points:', err);
    }
};

// GET /loyalty/config  — returns config + member count per tier
export const getLoyaltyConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        let config = await LoyaltyConfig.findOne();
        if (!config) config = await LoyaltyConfig.create({});

        // Auto-migrate database configurations if they contain the old name "Thành viên mới"
        let configUpdated = false;
        if (config.tiers && config.tiers.length > 0) {
            config.tiers.forEach(t => {
                if (t.name === 'Thành viên mới') { t.name = 'Đồng'; configUpdated = true; }
                if (t.name === 'Thành viên Bạc') { t.name = 'Bạc'; configUpdated = true; }
                if (t.name === 'Thành viên Vàng') { t.name = 'Vàng'; configUpdated = true; }
                if (t.name === 'Thành viên Kim Cương') { t.name = 'Kim Cương'; configUpdated = true; }
            });
            if (configUpdated) {
                await config.save();
                // Also update any customers pointing to the old tier names
                await Customer.updateMany({ tier: 'Thành viên mới' }, { $set: { tier: 'Đồng' } });
                await Customer.updateMany({ tier: 'Thành viên Bạc' }, { $set: { tier: 'Bạc' } });
                await Customer.updateMany({ tier: 'Thành viên Vàng' }, { $set: { tier: 'Vàng' } });
                await Customer.updateMany({ tier: 'Thành viên Kim Cương' }, { $set: { tier: 'Kim Cương' } });
            }
        }

        // Ensure any customers without any tier, or empty/null tier are assigned to the lowest active tier
        const lowestActiveTier = config.tiers.find(t => t.isActive !== false)?.name || 'Đồng';
        await Customer.updateMany(
            { $or: [{ tier: { $exists: false } }, { tier: null }, { tier: '' }] },
            { $set: { tier: lowestActiveTier } }
        );

        // Count members per tier
        const tierCounts = await Customer.aggregate([
            { $group: { _id: '$tier', count: { $sum: 1 } } }
        ]);
        const tierCountMap: Record<string, number> = {};
        tierCounts.forEach(t => { 
            if (t._id) tierCountMap[t._id] = t.count; 
        });

        const tiersWithCount = (config.tiers as any[]).map(t => ({
            ...t.toObject?.() ?? t,
            memberCount: tierCountMap[t.name] || 0
        }));

        res.json({ success: true, data: { ...config.toObject(), tiers: tiersWithCount } });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// PUT /loyalty/config
export const updateLoyaltyConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        let config = await LoyaltyConfig.findOne();
        if (!config) {
            config = await LoyaltyConfig.create(req.body);
        } else {
            Object.assign(config, req.body);
            await config.save();
        }
        res.json({ success: true, data: config });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /loyalty/recalculate
export const recalculateAllTiers = async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await LoyaltyConfig.findOne();
        if (!config) {
            res.status(404).json({ success: false, message: 'Chưa có cấu hình loyalty' });
            return;
        }
        const customers = await Customer.find();
        let updated = 0;
        for (const customer of customers) {
            const newTier = getTierForPoints(customer.loyaltyPoints || 0, config.tiers as any[], customer.tier);
            if (customer.tier !== newTier) {
                customer.tier = newTier;
                await customer.save();
                updated++;
            }
        }
        res.json({ success: true, message: `Đã cập nhật hạng cho ${updated} khách hàng` });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /loyalty/adjust/:customerId
export const adjustCustomerPoints = async (req: Request, res: Response): Promise<void> => {
    try {
        const { points, reason } = req.body;
        const customer = await Customer.findById(req.params.customerId);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
            return;
        }
        const config = await LoyaltyConfig.findOne();
        customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) + Number(points));
        if (config) customer.tier = getTierForPoints(customer.loyaltyPoints, config.tiers as any[], customer.tier);
        await customer.save();

        // Create log entry
        await PointHistory.create({
            customer: customer._id,
            points: Number(points),
            type: Number(points) >= 0 ? 'earn' : 'spend',
            reason: reason || 'Điều chỉnh điểm thủ công từ Admin'
        });

        res.json({ success: true, data: customer });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /loyalty/backfill — award points for all eligible unprocessed paid orders
export const backfillLoyaltyPoints = async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await LoyaltyConfig.findOne();
        if (!config) {
            res.status(404).json({ success: false, message: 'Chưa có cấu hình loyalty' });
            return;
        }

        // Fetch all paid orders with a customer that haven't been awarded yet
        const eligibleOrders = await Order.find({
            paymentStatus: 'paid',
            customer: { $ne: null },
            loyaltyAwarded: { $ne: true }
        }).lean();

        let processedCount = 0;
        let skippedCount = 0;
        let totalPointsAwarded = 0;
        const details: any[] = [];

        for (const order of eligibleOrders) {
            // Check applyToOrders filter
            const src = order.orderSource || 'website';
            if (config.applyToOrders !== 'all') {
                if (config.applyToOrders === 'pos' && src !== 'pos') { skippedCount++; continue; }
                if (config.applyToOrders === 'website' && src !== 'website') { skippedCount++; continue; }
            }

            const customer = await Customer.findById(order.customer);
            if (!customer) { skippedCount++; continue; }

            // Get tier multiplier BEFORE awarding (current tier)
            const currentTier = (config.tiers as any[]).find(t => t.name === customer.tier);
            const multiplier = currentTier?.pointMultiplier || 1;

            const vndToEarn = config.vndToEarnOnePoint || 100000;
            const pointsEarned = Math.floor((order.totalAmount / vndToEarn) * multiplier);

            if (pointsEarned > 0) {
                customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
                customer.totalSpent = (customer.totalSpent || 0) + order.totalAmount;
                customer.tier = getTierForPoints(customer.loyaltyPoints, config.tiers as any[], customer.tier);
                await customer.save();

                // Create point history entry
                await PointHistory.create({
                    customer: customer._id,
                    order: order._id,
                    points: pointsEarned,
                    type: 'earn',
                    reason: `Tích lũy từ đơn hàng ${src === 'pos' ? 'POS' : 'Website'} (Backfill)`
                });
            }

            // Mark order as processed
            await Order.findByIdAndUpdate(order._id, { loyaltyAwarded: true });

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
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// GET /loyalty/history/:customerId
export const getCustomerPointHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const history = await PointHistory.find({ customer: req.params.customerId })
            .populate('order', 'orderCode totalAmount')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: history });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};
