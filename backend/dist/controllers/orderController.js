"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectOrderReturn = exports.approveOrderReturn = exports.updateOrderStatus = exports.createOrder = exports.getOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
const Product_1 = __importDefault(require("../models/Product"));
const Promotion_1 = __importDefault(require("../models/Promotion"));
const Customer_1 = __importDefault(require("../models/Customer"));
const LoyaltyConfig_1 = __importDefault(require("../models/LoyaltyConfig"));
const PointHistory_1 = __importDefault(require("../models/PointHistory"));
const loyaltyController_1 = require("./loyaltyController");
const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.customer) {
            filter.customer = req.query.customer;
        }
        const orders = await Order_1.default.find(filter).populate('customer').populate('items.product').skip(skip).limit(limit).sort({ createdAt: -1 });
        const total = await Order_1.default.countDocuments(filter);
        res.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getOrders = getOrders;
const createOrder = async (req, res) => {
    try {
        const { customer: customerId, loyaltyPointsUsed = 0 } = req.body;
        let loyaltyDiscount = 0;
        let customerDoc = null;
        if (customerId && loyaltyPointsUsed > 0) {
            customerDoc = await Customer_1.default.findById(customerId);
            if (!customerDoc) {
                res.status(400).json({ success: false, message: 'Không tìm thấy khách hàng' });
                return;
            }
            if ((customerDoc.loyaltyPoints || 0) < loyaltyPointsUsed) {
                res.status(400).json({ success: false, message: `Số dư điểm tích luỹ không đủ (Khách có: ${customerDoc.loyaltyPoints || 0} điểm)` });
                return;
            }
            const loyaltyConfig = await LoyaltyConfig_1.default.findOne();
            if (loyaltyConfig && loyaltyConfig.isActive) {
                const subtotal = req.body.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
                if (subtotal < (loyaltyConfig.minOrderToUsePoints || 0)) {
                    res.status(400).json({ success: false, message: `Đơn hàng tối thiểu để dùng điểm là ${loyaltyConfig.minOrderToUsePoints.toLocaleString()}đ` });
                    return;
                }
                const redemptionRate = loyaltyConfig.vndPerPointRedemption || 1000;
                loyaltyDiscount = loyaltyPointsUsed * redemptionRate;
                const maxDiscountAllowed = subtotal * (loyaltyConfig.maxPointUsagePercent / 100);
                if (loyaltyDiscount > maxDiscountAllowed) {
                    res.status(400).json({ success: false, message: `Điểm quy đổi (${loyaltyDiscount.toLocaleString()}đ) vượt quá giới hạn tối đa ${loyaltyConfig.maxPointUsagePercent}% giá trị đơn (${maxDiscountAllowed.toLocaleString()}đ)` });
                    return;
                }
                req.body.loyaltyPointsUsed = loyaltyPointsUsed;
                req.body.loyaltyDiscount = loyaltyDiscount;
                req.body.discountAmount = (req.body.discountAmount || 0) + loyaltyDiscount;
                req.body.totalAmount = Math.max(0, req.body.totalAmount - loyaltyDiscount);
            }
        }
        const order = await Order_1.default.create(req.body);
        // Deduct stock from warehouse and sync product variants stock
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                const product = await Product_1.default.findById(item.product);
                if (!product)
                    continue;
                const targetSku = item.variantSku || product.sku;
                // 1. Deduct from active Warehouses
                const warehouses = await Warehouse_1.default.find({ status: 'active' });
                let qtyToDeduct = item.qty;
                for (const wh of warehouses) {
                    if (qtyToDeduct <= 0)
                        break;
                    const whProductIndex = wh.products.findIndex(p => p.productId.toString() === product._id.toString() &&
                        p.variantSku === targetSku);
                    if (whProductIndex !== -1) {
                        const whProduct = wh.products[whProductIndex];
                        if (whProduct.stock >= qtyToDeduct) {
                            whProduct.stock -= qtyToDeduct;
                            qtyToDeduct = 0;
                        }
                        else {
                            qtyToDeduct -= whProduct.stock;
                            whProduct.stock = 0;
                        }
                        wh.markModified('products');
                        await wh.save();
                    }
                }
                // 2. Sync to Product model variant stock
                const variantIndex = product.variants.findIndex(v => v.sku === targetSku);
                if (variantIndex !== -1) {
                    product.variants[variantIndex].stock = Math.max(0, product.variants[variantIndex].stock - item.qty);
                }
                // Increment sold count
                product.soldCount = (product.soldCount || 0) + item.qty;
                await product.save();
            }
        }
        // Increment used count on promotion if promotionCode was applied
        if (order.promotionCode) {
            await Promotion_1.default.findOneAndUpdate({ code: order.promotionCode }, { $inc: { usedCount: 1 } });
        }
        // Deduct loyalty points if used
        if (customerDoc && loyaltyPointsUsed > 0) {
            customerDoc.loyaltyPoints = Math.max(0, (customerDoc.loyaltyPoints || 0) - loyaltyPointsUsed);
            const loyaltyConfig = await LoyaltyConfig_1.default.findOne();
            if (loyaltyConfig) {
                customerDoc.tier = (0, loyaltyController_1.getTierForPoints)(customerDoc.loyaltyPoints, loyaltyConfig.tiers, customerDoc.tier);
            }
            await customerDoc.save();
            // Create log entry for point usage
            await PointHistory_1.default.create({
                customer: customerDoc._id,
                order: order._id,
                points: -loyaltyPointsUsed,
                type: 'spend',
                reason: `Sử dụng điểm thanh toán đơn hàng ${order.orderCode}`
            });
        }
        // Award loyalty points to customer if paid
        if (order.customer && order.paymentStatus === 'paid') {
            await (0, loyaltyController_1.awardLoyaltyPoints)(order.customer.toString(), order.totalAmount, order.orderSource, order._id.toString());
            // Mark so backfill won't double-award
            await Order_1.default.findByIdAndUpdate(order._id, { loyaltyAwarded: true });
        }
        res.status(201).json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createOrder = createOrder;
const updateOrderStatus = async (req, res) => {
    try {
        const { status, paymentStatus } = req.body;
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            return;
        }
        if (status)
            order.orderStatus = status;
        if (paymentStatus)
            order.paymentStatus = paymentStatus;
        // Auto-mark payment as paid when delivered
        if (order.orderStatus === 'delivered' && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
        }
        // Award loyalty points if paymentStatus is paid and not yet awarded
        if (order.customer && order.paymentStatus === 'paid' && !order.loyaltyAwarded) {
            await (0, loyaltyController_1.awardLoyaltyPoints)(order.customer.toString(), order.totalAmount, order.orderSource || 'website', order._id.toString());
            order.loyaltyAwarded = true;
        }
        await order.save();
        res.json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const approveOrderReturn = async (req, res) => {
    try {
        const { adminComment } = req.body;
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            return;
        }
        if (!order.returnRequest || order.returnRequest.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Không có yêu cầu hoàn trả đang chờ duyệt cho đơn hàng này' });
            return;
        }
        // 1. Update return request status and payment status
        order.returnRequest.status = 'approved';
        order.returnRequest.adminComment = adminComment || 'Đã đồng ý hoàn hàng & hoàn tiền';
        order.paymentStatus = 'refunded';
        // 2. Revert inventory/stock
        const firstWh = await Warehouse_1.default.findOne({ status: 'active' });
        if (firstWh) {
            for (const item of order.items) {
                const product = await Product_1.default.findById(item.product);
                if (!product)
                    continue;
                const targetSku = item.variantSku || product.sku;
                // Add back to warehouse stock
                const whProdIdx = firstWh.products.findIndex(p => p.productId.toString() === product._id.toString() &&
                    p.variantSku === targetSku);
                if (whProdIdx !== -1) {
                    firstWh.products[whProdIdx].stock += item.qty;
                }
                else {
                    firstWh.products.push({
                        productId: product._id,
                        variantSku: targetSku,
                        stock: item.qty
                    });
                }
                // Add back to product variant stock
                const variantIndex = product.variants.findIndex(v => v.sku === targetSku);
                if (variantIndex !== -1) {
                    product.variants[variantIndex].stock += item.qty;
                }
                product.soldCount = Math.max(0, (product.soldCount || 0) - item.qty);
                await product.save();
            }
            firstWh.markModified('products');
            await firstWh.save();
        }
        // 3. Refund / Deduct loyalty points
        if (order.customer) {
            const customer = await Customer_1.default.findById(order.customer);
            if (customer) {
                let pointsChanged = false;
                // A. Deduct points earned from this order
                const earnHistory = await PointHistory_1.default.findOne({
                    customer: customer._id,
                    order: order._id,
                    type: 'earn'
                });
                if (earnHistory && earnHistory.points > 0) {
                    customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) - earnHistory.points);
                    customer.totalSpent = Math.max(0, (customer.totalSpent || 0) - order.totalAmount);
                    pointsChanged = true;
                    await PointHistory_1.default.create({
                        customer: customer._id,
                        order: order._id,
                        points: -earnHistory.points,
                        type: 'refund',
                        reason: `Trừ điểm tích lũy do hoàn trả đơn hàng ${order.orderCode}`
                    });
                }
                // B. Refund points spent on this order
                const spendHistory = await PointHistory_1.default.findOne({
                    customer: customer._id,
                    order: order._id,
                    type: 'spend'
                });
                if (spendHistory && spendHistory.points < 0) {
                    const pointsToRefund = Math.abs(spendHistory.points);
                    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsToRefund;
                    pointsChanged = true;
                    await PointHistory_1.default.create({
                        customer: customer._id,
                        order: order._id,
                        points: pointsToRefund,
                        type: 'refund',
                        reason: `Hoàn lại điểm tích lũy sử dụng tại đơn hàng ${order.orderCode}`
                    });
                }
                // Recalculate membership tier if points changed
                if (pointsChanged) {
                    const config = await LoyaltyConfig_1.default.findOne();
                    if (config) {
                        customer.tier = (0, loyaltyController_1.getTierForPoints)(customer.loyaltyPoints, config.tiers, customer.tier);
                    }
                    await customer.save();
                }
            }
        }
        await order.save();
        res.json({ success: true, message: 'Đã phê duyệt hoàn hàng và hoàn tiền thành công', data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.approveOrderReturn = approveOrderReturn;
const rejectOrderReturn = async (req, res) => {
    try {
        const { adminComment } = req.body;
        if (!adminComment || adminComment.trim() === '') {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối cụ thể' });
            return;
        }
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            return;
        }
        if (!order.returnRequest || order.returnRequest.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Không có yêu cầu hoàn trả đang chờ duyệt cho đơn hàng này' });
            return;
        }
        order.returnRequest.status = 'rejected';
        order.returnRequest.adminComment = adminComment;
        await order.save();
        res.json({ success: true, message: 'Đã từ chối hoàn hàng thành công', data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.rejectOrderReturn = rejectOrderReturn;
