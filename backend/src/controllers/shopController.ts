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
        else if (sort === 'bestseller') sortOption = { soldCount: -1 };

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
        });
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

        res.json({ success: true, data: flashSale });
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
        const { code, orderAmount } = req.body;
        if (!code) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã giảm giá' });
            return;
        }

        const now = new Date();
        const voucher = await Promotion.findOne({ code, status: 'active' });
        
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
            discountAmount = 0,
            shippingFee = 0,
            totalAmount,
            note
        } = req.body;

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
        }

        // Increment promotion code usage
        if (promotionCode) {
            await Promotion.findOneAndUpdate(
                { code: promotionCode },
                { $inc: { usedCount: 1 } }
            );
        }

        // Record customer loyalty spending if customer is logged in
        if (customerId) {
            const customerDoc = await Customer.findById(customerId);
            if (customerDoc) {
                customerDoc.totalSpent = (customerDoc.totalSpent || 0) + totalAmount;
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
            promotionCode: promotionCode || null,
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
