const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/saas_admin';

// Inline models definition to avoid file loading issues
const CustomerSchema = new mongoose.Schema({
    loyaltyPoints: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    tier: { type: String, default: 'Đồng' }
});
const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);

const OrderSchema = new mongoose.Schema({
    paymentStatus: String,
    customer: mongoose.Schema.Types.ObjectId,
    totalAmount: Number,
    orderSource: String,
    createdAt: Date,
    orderCode: String
});
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

const LoyaltyConfigSchema = new mongoose.Schema({
    tiers: Array,
    vndToEarnOnePoint: Number
});
const LoyaltyConfig = mongoose.models.LoyaltyConfig || mongoose.model('LoyaltyConfig', LoyaltyConfigSchema);

const PointHistorySchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    points: { type: Number, required: true },
    type: { type: String, required: true },
    reason: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
const PointHistory = mongoose.models.PointHistory || mongoose.model('PointHistory', PointHistorySchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected successfully!');

        const config = await LoyaltyConfig.findOne();
        if (!config) {
            console.log('Chưa có cấu hình loyalty!');
            process.exit(1);
        }

        // 1. Backfill from past paid orders
        const paidOrders = await Order.find({
            paymentStatus: 'paid',
            customer: { $ne: null }
        });

        console.log(`Found ${paidOrders.length} paid orders.`);
        let orderLogsCreated = 0;

        for (const order of paidOrders) {
            // Check if log already exists for this order
            const existingLog = await PointHistory.findOne({ order: order._id });
            if (existingLog) continue;

            const customer = await Customer.findById(order.customer);
            if (!customer) continue;

            // Calculate points earned for this order
            const currentTier = config.tiers.find(t => t.name === customer.tier) || config.tiers[0];
            const multiplier = currentTier ? currentTier.pointMultiplier : 1;
            const vndToEarn = config.vndToEarnOnePoint || 100000;
            const pointsEarned = Math.floor((order.totalAmount / vndToEarn) * multiplier);

            if (pointsEarned > 0) {
                await PointHistory.create({
                    customer: customer._id,
                    order: order._id,
                    points: pointsEarned,
                    type: 'earn',
                    reason: `Tích lũy từ đơn hàng ${order.orderSource === 'pos' ? 'POS' : 'Website'} (Tự động backfill)`,
                    createdAt: order.createdAt // Keep order creation date
                });
                orderLogsCreated++;
            }
        }
        console.log(`Created ${orderLogsCreated} point history logs from past orders.`);

        // 2. Adjust differences: if customer has points > sum of their history logs
        const customers = await Customer.find();
        let customerAdjustmentsCreated = 0;

        for (const customer of customers) {
            const historySum = await PointHistory.aggregate([
                { $match: { customer: customer._id } },
                { $group: { _id: null, total: { $sum: '$points' } } }
            ]);

            const currentHistoryTotal = historySum.length > 0 ? historySum[0].total : 0;
            const diff = (customer.loyaltyPoints || 0) - currentHistoryTotal;

            if (diff !== 0) {
                await PointHistory.create({
                    customer: customer._id,
                    points: diff,
                    type: diff > 0 ? 'earn' : 'spend',
                    reason: diff > 0 ? 'Điểm tích luỹ hệ thống ban đầu' : 'Khấu trừ điều chỉnh điểm hệ thống',
                    createdAt: new Date()
                });
                customerAdjustmentsCreated++;
            }
        }
        console.log(`Created ${customerAdjustmentsCreated} point adjustment logs to match current points.`);

    } catch (e) {
        console.error('Error running backfill script:', e.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB Disconnected.');
    }
}

run();
