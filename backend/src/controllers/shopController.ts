import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Product from '../models/Product';
import Category from '../models/Category';
import Customer from '../models/Customer';
import Order from '../models/Order';
import Promotion from '../models/Promotion';
import FlashSale from '../models/FlashSale';
import Setting from '../models/Setting';
import ShippingConfig from '../models/ShippingConfig';
import Warehouse from '../models/Warehouse';
import LoyaltyConfig from '../models/LoyaltyConfig';
import { CustomerAuthRequest } from '../middlewares/authMiddleware';

// Generates JWT token for customers
const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '7d' });
};

// ===========================================
// CUSTOMER AUTHENTICATION & PROFILE
// ===========================================

export const shopRegister = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, phone, email, password } = req.body;
        if (!name || !phone || !password) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Mật khẩu' });
            return;
        }

        // Check if customer already exists by phone or email
        let customer = await Customer.findOne({ $or: [{ phone }, { email: email || '___none___' }] });
        
        if (customer) {
            if (customer.password) {
                res.status(400).json({ success: false, message: 'Số điện thoại hoặc Email này đã được đăng ký tài khoản' });
                return;
            }
            // Existing customer from POS/Admin, setting password now
            const salt = await bcrypt.genSalt(10);
            customer.password = await bcrypt.hash(password, salt);
            if (email) customer.email = email;
            if (name) customer.name = name;
            await customer.save();
        } else {
            // Create brand new customer
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            customer = await Customer.create({
                name,
                phone,
                email: email || undefined,
                password: hashedPassword,
                loyaltyPoints: 0,
                tier: 'Đồng',
                totalSpent: 0
            });
        }

        const token = generateToken(customer._id.toString());
        res.status(201).json({
            success: true,
            token,
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                avatar: customer.avatar,
                tier: customer.tier,
                loyaltyPoints: customer.loyaltyPoints
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const shopLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { loginKey, password } = req.body; // loginKey can be phone or email
        if (!loginKey || !password) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
            return;
        }

        const customer = await Customer.findOne({
            $or: [{ phone: loginKey }, { email: loginKey }]
        });

        if (!customer || !customer.password) {
            res.status(400).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
            return;
        }

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
            return;
        }

        const token = generateToken(customer._id.toString());
        res.json({
            success: true,
            token,
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                avatar: customer.avatar,
                tier: customer.tier,
                loyaltyPoints: customer.loyaltyPoints
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getShopProfile = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const customer = await Customer.findById(req.customer?._id).select('-password');
        res.json({ success: true, data: customer });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const updateShopProfile = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const { name, email, gender, avatar, address } = req.body;
        const customer = await Customer.findById(req.customer?._id);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
            return;
        }

        if (name) customer.name = name;
        if (email) customer.email = email;
        if (gender) customer.gender = gender;
        if (avatar !== undefined) customer.avatar = avatar;
        if (address) customer.address = address;

        await customer.save();
        res.json({
            success: true,
            data: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                avatar: customer.avatar,
                gender: customer.gender,
                address: customer.address,
                tier: customer.tier,
                loyaltyPoints: customer.loyaltyPoints
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// CRUD customer addresses
export const getAddresses = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const customer = await Customer.findById(req.customer?._id);
        res.json({ success: true, data: customer?.addresses || [] });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const addAddress = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const customer = await Customer.findById(req.customer?._id);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Khách hàng không tồn tại' });
            return;
        }

        const newAddress = req.body;
        if (newAddress.isDefault && customer.addresses) {
            customer.addresses.forEach(addr => addr.isDefault = false);
        }

        customer.addresses = customer.addresses || [];
        customer.addresses.push(newAddress);
        await customer.save();
        res.status(201).json({ success: true, data: customer.addresses });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const updateAddress = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const customer = await Customer.findById(req.customer?._id);
        if (!customer || !customer.addresses) {
            res.status(404).json({ success: false, message: 'Không tìm thấy thông tin' });
            return;
        }

        const addrId = req.params.id;
        const updatedFields = req.body;

        const addrIndex = customer.addresses.findIndex(addr => (addr as any)._id.toString() === addrId);
        if (addrIndex === -1) {
            res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại' });
            return;
        }

        if (updatedFields.isDefault) {
            customer.addresses.forEach(addr => addr.isDefault = false);
        }

        const addrObj = (customer.addresses[addrIndex] as any).toObject ? (customer.addresses[addrIndex] as any).toObject() : customer.addresses[addrIndex];
        customer.addresses[addrIndex] = { ...addrObj, ...updatedFields };
        await customer.save();
        res.json({ success: true, data: customer.addresses });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const deleteAddress = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const customer = await Customer.findById(req.customer?._id);
        if (!customer || !customer.addresses) {
            res.status(404).json({ success: false, message: 'Không tìm thấy thông tin' });
            return;
        }

        const addrId = req.params.id;
        customer.addresses = customer.addresses.filter(addr => (addr as any)._id.toString() !== addrId);
        await customer.save();
        res.json({ success: true, data: customer.addresses });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================================
// PRODUCTS & CATALOG API
// ===========================================

export const getShopProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, search, minPrice, maxPrice, sort, page = 1, limit = 20, isFeatured } = req.query;
        const query: any = { status: 'active' };

        // Category filter (supports parent/child)
        if (category) {
            const catId = category as string;
            const subCategories = await Category.find({ parentId: catId });
            const catIds = [catId, ...subCategories.map(c => c._id)];
            query.categoryIds = { $in: catIds };
        }

        // Search text
        if (search) {
            const keyword = search as string;
            query.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { sku: { $regex: keyword, $options: 'i' } }
            ];
        }

        // Price range
        if (minPrice || maxPrice) {
            query.priceSale = {};
            if (minPrice) query.priceSale.$gte = Number(minPrice);
            if (maxPrice) query.priceSale.$lte = Number(maxPrice);
        }

        // isFeatured
        if (isFeatured === 'true') {
            query.isFeatured = true;
        }

        // Sort configuration
        let sortOption: any = { createdAt: -1 };
        if (sort === 'priceAsc') sortOption = { priceSale: 1 };
        else if (sort === 'priceDesc') sortOption = { priceSale: -1 };
        else if (sort === 'newest') sortOption = { createdAt: -1 };
        else if (sort === 'bestseller') {
            sortOption = { soldCount: -1 };
            query.soldCount = { $gt: 0 };
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const products = await Product.find(query)
            .populate('categoryIds', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            data: products,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getShopProductDetail = async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await Product.findOne({ _id: req.params.id, status: 'active' })
            .populate('categoryIds', 'name');
            
        if (!product) {
            res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại hoặc đã dừng bán' });
            return;
        }

        // Related products in the same categories
        const related = await Product.find({
            _id: { $ne: product._id },
            categoryIds: { $in: product.categoryIds },
            status: 'active'
        }).limit(4);

        // Fetch applicable vouchers
        const now = new Date();
        const activeVouchers = await Promotion.find({
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now },
            applyType: 'product',
            applyProductIds: product._id
        });

        res.json({
            success: true,
            data: product,
            related,
            vouchers: activeVouchers
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Build tree structured categories
export const getShopCategoriesTree = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await Category.find({ status: 'active' }).lean();
        const parentCategories = categories.filter(c => !c.parentId);
        
        const tree = parentCategories.map(parent => {
            const children = categories.filter(c => c.parentId && c.parentId.toString() === parent._id.toString());
            return {
                ...parent,
                children
            };
        });

        res.json({ success: true, data: tree });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================================
// PROMOTIONS & FLASH SALES
// ===========================================

export const getShopPromotions = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const promotions = await Promotion.find({
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).populate('applyProductIds buyProductId getProductId', 'name sku');
        res.json({ success: true, data: promotions });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getShopActiveFlashSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const flashSale = await FlashSale.findOne({
            status: 'active',
            startTime: { $lte: now },
            endTime: { $gte: now }
        }).populate('products.product');

        if (flashSale) {
            const plainSale = flashSale.toObject();
            plainSale.products = plainSale.products.filter((p: any) => p.active && p.product);
            res.json({ success: true, data: plainSale });
            return;
        }

        res.json({ success: true, data: null });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================================
// CHECKOUT & SHIPPING
// ===========================================

export const getShopShippingConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await ShippingConfig.findOne({ status: 'active' });
        res.json({ success: true, data: config });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getShopBranches = async (req: Request, res: Response): Promise<void> => {
    try {
        // Warehouse branches configured as locations
        const locations = await Setting.findOne().select('addresses');
        res.json({ success: true, data: locations?.addresses || [] });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const validateShopVoucher = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, orderAmount, items } = req.body;
        if (!code) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã giảm giá' });
            return;
        }

        const now = new Date();
        const voucher = await Promotion.findOne({ code, status: 'active' }).populate('applyProductIds buyProductId getProductId', 'name sku');
        
        if (!voucher) {
            res.status(400).json({ success: false, message: 'Mã giảm giá không tồn tại hoặc đã tắt' });
            return;
        }

        if (now < voucher.startDate || now > voucher.endDate) {
            res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn sử dụng' });
            return;
        }

        if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) {
            res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng' });
            return;
        }

        if (orderAmount < voucher.minOrderValue) {
            res.status(400).json({ success: false, message: `Mã giảm giá chỉ áp dụng cho đơn hàng tối thiểu từ ${voucher.minOrderValue.toLocaleString()}đ` });
            return;
        }

        // Validate product-specific voucher
        if (voucher.applyType === 'product' && voucher.applyProductIds && voucher.applyProductIds.length > 0) {
            if (!items || !Array.isArray(items) || items.length === 0) {
                res.status(400).json({ success: false, message: 'Mã giảm giá này chỉ áp dụng cho một số sản phẩm nhất định.' });
                return;
            }
            const applicableProductIdsStr = voucher.applyProductIds.map(p => (p._id || p).toString());
            const hasApplicableProduct = items.some(item => {
                const prodId = typeof item.product === 'object' ? item.product?._id : item.product;
                return applicableProductIdsStr.includes(prodId?.toString());
            });
            if (!hasApplicableProduct) {
                res.status(400).json({ success: false, message: 'Giỏ hàng không chứa sản phẩm được áp dụng mã giảm giá này.' });
                return;
            }
        }

        // Validate buy_x_get_y voucher
        if (voucher.applyType === 'buy_x_get_y') {
            if (!items || !Array.isArray(items) || items.length === 0) {
                res.status(400).json({ success: false, message: 'Chương trình mua X tặng Y yêu cầu có sản phẩm trong giỏ hàng.' });
                return;
            }
            const buyProdId = (voucher.buyProductId?._id || voucher.buyProductId)?.toString();
            const getProdId = (voucher.getProductId?._id || voucher.getProductId)?.toString();
            
            const buyItem = items.find(item => {
                const prodId = typeof item.product === 'object' ? item.product?._id : item.product;
                return prodId?.toString() === buyProdId;
            });
            const getItem = items.find(item => {
                const prodId = typeof item.product === 'object' ? item.product?._id : item.product;
                return prodId?.toString() === getProdId;
            });

            if (!buyItem || buyItem.qty < (voucher.buyQty || 1)) {
                res.status(400).json({ success: false, message: `Mã giảm giá yêu cầu mua tối thiểu ${voucher.buyQty || 1} sản phẩm điều kiện.` });
                return;
            }
            if (!getItem) {
                res.status(400).json({ success: false, message: `Vui lòng thêm sản phẩm được ưu đãi vào giỏ hàng để được giảm giá.` });
                return;
            }
        }

        res.json({ success: true, data: voucher });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Checkout order placing endpoint
export const placeShopOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            customer: customerId,
            items,
            shippingAddress,
            deliveryType, // 'shipping' | 'pickup'
            pickupBranch, // branch address if self-pickup
            paymentMethod,
            promotionCode,
            promotionCodes,
            discountAmount = 0,
            tierDiscountAmount = 0,
            shippingFee = 0,
            totalAmount,
            note
        } = req.body;

        // Support both single promotionCode (legacy) and promotionCodes array
        const allPromoCodes: string[] = [
            ...( Array.isArray(promotionCodes) ? promotionCodes : [] ),
            ...( promotionCode ? [promotionCode] : [] )
        ].filter(Boolean);

        if (!items || items.length === 0) {
            res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
            return;
        }

        // Generate WS orderCode
        const orderCode = 'WS' + Date.now().toString().slice(-8) + Math.floor(100 + Math.random() * 900);

        // Deduct inventory
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                res.status(400).json({ success: false, message: `Sản phẩm với ID ${item.product} không tồn tại` });
                return;
            }

            const targetSku = item.variantSku || product.sku;

            // 1. Deduct from Warehouses (First active warehouse containing stock)
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

            product.soldCount = (product.soldCount || 0) + item.qty;
            await product.save();

            // 3. Update Flash Sale soldQty if there is an active campaign
            const now = new Date();
            const activeFlashCampaign = await FlashSale.findOne({
                status: 'active',
                startTime: { $lte: now },
                endTime: { $gte: now },
                'products.product': product._id
            });

            if (activeFlashCampaign) {
                const fsProduct = activeFlashCampaign.products.find(p => p.product.toString() === product._id.toString());
                if (fsProduct && fsProduct.active) {
                    fsProduct.soldQty = (fsProduct.soldQty || 0) + item.qty;
                    activeFlashCampaign.markModified('products');
                    await activeFlashCampaign.save();
                }
            }
        }

        // Increment usage count for all applied promotion codes
        if (allPromoCodes.length > 0) {
            await Promotion.updateMany(
                { code: { $in: allPromoCodes } },
                { $inc: { usedCount: 1 } }
            );
        }

        // Award loyalty points and upgrade tier for logged-in customers
        if (customerId) {
            const customerDoc = await Customer.findById(customerId);
            if (customerDoc) {
                customerDoc.totalSpent = (customerDoc.totalSpent || 0) + totalAmount;

                // Fetch loyalty config
                const loyaltyConf = await LoyaltyConfig.findOne();
                if (loyaltyConf && loyaltyConf.isActive) {
                    const shouldEarn = loyaltyConf.applyToOrders === 'all' || loyaltyConf.applyToOrders === 'website';
                    if (shouldEarn) {
                        const vndPerPoint = loyaltyConf.vndToEarnOnePoint || 100000;
                        // Find customer tier multiplier
                        const activeTiers = loyaltyConf.tiers.filter(t => t.isActive).sort((a, b) => b.minPoints - a.minPoints);
                        const currentTier = activeTiers.find(t => (customerDoc.loyaltyPoints || 0) >= t.minPoints);
                        const multiplier = currentTier?.pointMultiplier || 1;

                        const earnedPoints = Math.floor((totalAmount / vndPerPoint) * multiplier);
                        customerDoc.loyaltyPoints = (customerDoc.loyaltyPoints || 0) + earnedPoints;

                        // Upgrade tier based on new point total
                        const newTier = activeTiers.find(t => customerDoc.loyaltyPoints! >= t.minPoints);
                        if (newTier) customerDoc.tier = newTier.name;
                    }
                }

                await customerDoc.save();
            }
        }

        // Construct Note string with address if shipping
        let finalNote = note || '';
        if (deliveryType === 'pickup') {
            finalNote = `[Nhận tại cửa hàng: ${pickupBranch}] ${finalNote}`;
        } else if (shippingAddress) {
            const { name, phone, province, district, ward, detail } = shippingAddress;
            finalNote = `[Địa chỉ nhận: ${name} - ${phone} | ${detail}, ${ward}, ${district}, ${province}] ${finalNote}`;
        }

        const newOrder = await Order.create({
            orderCode,
            customer: customerId || null,
            items,
            totalAmount,
            discountAmount,
            promotionCode: allPromoCodes.length > 0 ? allPromoCodes.join(', ') : null,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            orderSource: 'website',
            note: finalNote
        });

        res.status(201).json({ success: true, data: newOrder });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================================
// CUSTOMER ORDER HISTORY
// ===========================================

export const getShopOrders = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.query;
        const query: any = { customer: req.customer?._id };
        
        if (status) {
            query.orderStatus = status;
        }

        const orders = await Order.find(query)
            .populate('items.product')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: orders });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getShopOrderDetail = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const order = await Order.findOne({ _id: req.params.id, customer: req.customer?._id })
            .populate('items.product');

        if (!order) {
            res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng của bạn' });
            return;
        }

        res.json({ success: true, data: order });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const cancelShopOrder = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
        const order = await Order.findOne({ _id: req.params.id, customer: req.customer?._id });
        if (!order) {
            res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            return;
        }

        if (order.orderStatus !== 'pending' && order.orderStatus !== 'confirmed') {
            res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn khi đơn hàng đang ở trạng thái chờ xác nhận hoặc đã xác nhận' });
            return;
        }

        order.orderStatus = 'cancelled';
        await order.save();

        // Refund inventory stocks
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (!product) continue;

            const targetSku = item.variantSku || product.sku;

            // 1. Return to first active Warehouse
            const firstWarehouse = await Warehouse.findOne({ status: 'active' });
            if (firstWarehouse) {
                const whProductIndex = firstWarehouse.products.findIndex(p => 
                    p.productId.toString() === product._id.toString() && 
                    p.variantSku === targetSku
                );

                if (whProductIndex !== -1) {
                    firstWarehouse.products[whProductIndex].stock += item.qty;
                    firstWarehouse.markModified('products');
                    await firstWarehouse.save();
                }
            }

            // 2. Refund to Product model variant stock
            const variantIndex = product.variants.findIndex(v => v.sku === targetSku);
            if (variantIndex !== -1) {
                product.variants[variantIndex].stock += item.qty;
            }
            
            product.soldCount = Math.max(0, (product.soldCount || 0) - item.qty);
            await product.save();
        }

        res.json({ success: true, message: 'Đã hủy đơn hàng thành công', data: order });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// General settings for storefront (logo, name, banners, footer maps)
export const getShopStoreSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = await Setting.findOne();
        res.json({ success: true, data: settings });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const shopSendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone } = req.body;
        if (!phone) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập Số điện thoại để nhận mã OTP' });
            return;
        }

        const customer = await Customer.findOne({ phone: phone.trim() });
        if (!customer) {
            res.status(404).json({ success: false, message: 'Số điện thoại này chưa được đăng ký tài khoản' });
            return;
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpireTime = new Date(Date.now() + 5 * 60 * 1000);

        customer.otpCode = otpCode;
        customer.otpExpireTime = otpExpireTime;
        await customer.save();

        res.json({ 
            success: true, 
            message: 'Mã OTP khôi phục mật khẩu đã được tạo thành công', 
            otpCode
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const shopForgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone, otpCode, newPassword } = req.body;
        if (!phone || !otpCode || !newPassword) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ Số điện thoại, Mã OTP và Mật khẩu mới' });
            return;
        }

        const customer = await Customer.findOne({ phone: phone.trim() });
        if (!customer) {
            res.status(404).json({ success: false, message: 'Số điện thoại này chưa được đăng ký tài khoản' });
            return;
        }

        if (!customer.otpCode || customer.otpCode !== otpCode.trim()) {
            res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
            return;
        }

        if (!customer.otpExpireTime || new Date() > customer.otpExpireTime) {
            res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn sử dụng. Vui lòng nhận lại mã mới!' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        customer.password = hashedPassword;
        customer.otpCode = undefined;
        customer.otpExpireTime = undefined;
        await customer.save();

        res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại!' });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const shopChangePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới' });
            return;
        }

        const customerId = (req as any).customer?._id;
        const customer = await Customer.findById(customerId);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản' });
            return;
        }

        if (!customer.password) {
            res.status(400).json({ success: false, message: 'Tài khoản chưa được thiết lập mật khẩu' });
            return;
        }

        const isMatch = await bcrypt.compare(oldPassword, customer.password);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        customer.password = hashedPassword;
        await customer.save();

        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================================
// PUBLIC LOYALTY CONFIG (for storefront)
// ===========================================
export const getShopLoyaltyConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await LoyaltyConfig.findOne();
        if (!config) {
            res.json({ success: true, data: null });
            return;
        }
        // Return public-safe fields only (tiers and basic earn config)
        res.json({
            success: true,
            data: {
                vndToEarnOnePoint: config.vndToEarnOnePoint,
                vndPerPointRedemption: config.vndPerPointRedemption,
                tiers: config.tiers.filter(t => t.isActive).map(t => ({
                    name: t.name,
                    minPoints: t.minPoints,
                    discountPercent: t.discountPercent,
                    pointMultiplier: t.pointMultiplier,
                    color: t.color,
                    icon: t.icon,
                })),
                isActive: config.isActive,
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};
