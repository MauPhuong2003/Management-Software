import { Request, Response } from 'express';
import Order from '../models/Order';
import Warehouse from '../models/Warehouse';
import Product from '../models/Product';
import Promotion from '../models/Promotion';
import Customer from '../models/Customer';
import LoyaltyConfig from '../models/LoyaltyConfig';
import PointHistory from '../models/PointHistory';
import { awardLoyaltyPoints, getTierForPoints } from './loyaltyController';

export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (req.query.customer) {
            filter.customer = req.query.customer;
        }

        const orders = await Order.find(filter).populate('customer').populate('items.product').skip(skip).limit(limit).sort({ createdAt: -1 });
        const total = await Order.countDocuments(filter);

        res.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customer: customerId, loyaltyPointsUsed = 0 } = req.body;
        let loyaltyDiscount = 0;
        let customerDoc = null;

        if (customerId && loyaltyPointsUsed > 0) {
            customerDoc = await Customer.findById(customerId);
            if (!customerDoc) {
                res.status(400).json({ success: false, message: 'Không tìm thấy khách hàng' });
                return;
            }

            if ((customerDoc.loyaltyPoints || 0) < loyaltyPointsUsed) {
                res.status(400).json({ success: false, message: `Số dư điểm tích luỹ không đủ (Khách có: ${customerDoc.loyaltyPoints || 0} điểm)` });
                return;
            }

            const loyaltyConfig = await LoyaltyConfig.findOne();
            if (loyaltyConfig && loyaltyConfig.isActive) {
                const subtotal = req.body.items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);
                
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

        const order = await Order.create(req.body);

        // Deduct stock from warehouse and sync product variants stock
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (!product) continue;

                const targetSku = item.variantSku || product.sku;

                // 1. Deduct from active Warehouses
                const warehouses = await Warehouse.find({ status: 'active' });
                let qtyToDeduct = item.qty;

                for (const wh of warehouses) {
                    if (qtyToDeduct <= 0) break;
                    
                    const whProductIndex = wh.products.findIndex(p => 
                        p.productId.toString() === product._id.toString() && 
                        p.variantSku === targetSku
                    );

                    if (whProductIndex !== -1) {
                        const whProduct = wh.products[whProductIndex];
                        if (whProduct.stock >= qtyToDeduct) {
                            whProduct.stock -= qtyToDeduct;
                            qtyToDeduct = 0;
                        } else {
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
            await Promotion.findOneAndUpdate(
                { code: order.promotionCode },
                { $inc: { usedCount: 1 } }
            );
        }

        // Deduct loyalty points if used
        if (customerDoc && loyaltyPointsUsed > 0) {
            customerDoc.loyaltyPoints = Math.max(0, (customerDoc.loyaltyPoints || 0) - loyaltyPointsUsed);
            const loyaltyConfig = await LoyaltyConfig.findOne();
            if (loyaltyConfig) {
                customerDoc.tier = getTierForPoints(customerDoc.loyaltyPoints, loyaltyConfig.tiers as any[], customerDoc.tier);
            }
            await customerDoc.save();

            // Create log entry for point usage
            await PointHistory.create({
                customer: customerDoc._id,
                order: order._id,
                points: -loyaltyPointsUsed,
                type: 'spend',
                reason: `Sử dụng điểm thanh toán đơn hàng ${order.orderCode}`
            });
        }

        // Award loyalty points to customer if paid
        if (order.customer && order.paymentStatus === 'paid') {
            await awardLoyaltyPoints(
                order.customer.toString(),
                order.totalAmount,
                order.orderSource,
                order._id.toString()
            );
            // Mark so backfill won't double-award
            await Order.findByIdAndUpdate(order._id, { loyaltyAwarded: true });
        }

        res.status(201).json({ success: true, data: order });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, paymentStatus } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            return;
        }

        if (status) order.orderStatus = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;

        // Auto-mark payment as paid when delivered
        if (order.orderStatus === 'delivered' && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
        }

        // Award loyalty points if paymentStatus is paid and not yet awarded
        if (order.customer && order.paymentStatus === 'paid' && !order.loyaltyAwarded) {
            await awardLoyaltyPoints(
                order.customer.toString(),
                order.totalAmount,
                order.orderSource || 'website',
                order._id.toString()
            );
            order.loyaltyAwarded = true;
        }

        await order.save();
        res.json({ success: true, data: order });
    } catch (e: any) { 
        res.status(500).json({ success: false, message: e.message }); 
    }
};

export const approveOrderReturn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminComment } = req.body;
        const order = await Order.findById(req.params.id);
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
        const firstWh = await Warehouse.findOne({ status: 'active' });
        if (firstWh) {
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (!product) continue;
                const targetSku = item.variantSku || product.sku;

                // Add back to warehouse stock
                const whProdIdx = firstWh.products.findIndex(p =>
                    p.productId.toString() === product._id.toString() &&
                    p.variantSku === targetSku
                );
                if (whProdIdx !== -1) {
                    firstWh.products[whProdIdx].stock += item.qty;
                } else {
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
            const customer = await Customer.findById(order.customer);
            if (customer) {
                let pointsChanged = false;

                // A. Deduct points earned from this order
                const earnHistory = await PointHistory.findOne({
                    customer: customer._id,
                    order: order._id,
                    type: 'earn'
                });
                if (earnHistory && earnHistory.points > 0) {
                    customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) - earnHistory.points);
                    customer.totalSpent = Math.max(0, (customer.totalSpent || 0) - order.totalAmount);
                    pointsChanged = true;

                    await PointHistory.create({
                        customer: customer._id,
                        order: order._id,
                        points: -earnHistory.points,
                        type: 'refund',
                        reason: `Trừ điểm tích lũy do hoàn trả đơn hàng ${order.orderCode}`
                    });
                }

                // B. Refund points spent on this order
                const spendHistory = await PointHistory.findOne({
                    customer: customer._id,
                    order: order._id,
                    type: 'spend'
                });
                if (spendHistory && spendHistory.points < 0) {
                    const pointsToRefund = Math.abs(spendHistory.points);
                    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsToRefund;
                    pointsChanged = true;

                    await PointHistory.create({
                        customer: customer._id,
                        order: order._id,
                        points: pointsToRefund,
                        type: 'refund',
                        reason: `Hoàn lại điểm tích lũy sử dụng tại đơn hàng ${order.orderCode}`
                    });
                }

                // Recalculate membership tier if points changed
                if (pointsChanged) {
                    const config = await LoyaltyConfig.findOne();
                    if (config) {
                        customer.tier = getTierForPoints(customer.loyaltyPoints, config.tiers as any[], customer.tier);
                    }
                    await customer.save();
                }
            }
        }

        await order.save();
        res.json({ success: true, message: 'Đã phê duyệt hoàn hàng và hoàn tiền thành công', data: order });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const rejectOrderReturn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminComment } = req.body;
        if (!adminComment || adminComment.trim() === '') {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối cụ thể' });
            return;
        }

        const order = await Order.findById(req.params.id);
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
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};
