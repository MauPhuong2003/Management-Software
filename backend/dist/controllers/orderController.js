"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.createOrder = exports.getOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
const Product_1 = __importDefault(require("../models/Product"));
const Promotion_1 = __importDefault(require("../models/Promotion"));
const Customer_1 = __importDefault(require("../models/Customer"));
const LoyaltyConfig_1 = __importDefault(require("../models/LoyaltyConfig"));
const loyaltyController_1 = require("./loyaltyController");
const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const orders = await Order_1.default.find().populate('customer').populate('items.product').skip(skip).limit(limit).sort({ createdAt: -1 });
        const total = await Order_1.default.countDocuments();
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
        }
        // Award loyalty points to customer if paid
        if (order.customer && order.paymentStatus === 'paid') {
            await (0, loyaltyController_1.awardLoyaltyPoints)(order.customer.toString(), order.totalAmount, order.orderSource);
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
        const order = await Order_1.default.findByIdAndUpdate(req.params.id, { orderStatus: req.body.status }, { new: true });
        res.json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateOrderStatus = updateOrderStatus;
