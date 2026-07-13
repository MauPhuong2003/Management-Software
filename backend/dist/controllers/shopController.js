"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShopStoreSettings = exports.cancelShopOrder = exports.getShopOrderDetail = exports.getShopOrders = exports.placeShopOrder = exports.validateShopVoucher = exports.getShopBranches = exports.getShopShippingConfigs = exports.getShopActiveFlashSale = exports.getShopPromotions = exports.getShopCategoriesTree = exports.getShopProductDetail = exports.getShopProducts = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAddresses = exports.updateShopProfile = exports.getShopProfile = exports.shopLogin = exports.shopRegister = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Order_1 = __importDefault(require("../models/Order"));
const Promotion_1 = __importDefault(require("../models/Promotion"));
const FlashSale_1 = __importDefault(require("../models/FlashSale"));
const Setting_1 = __importDefault(require("../models/Setting"));
const ShippingConfig_1 = __importDefault(require("../models/ShippingConfig"));
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
// Generates JWT token for customers
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '7d' });
};
// ===========================================
// CUSTOMER AUTHENTICATION & PROFILE
// ===========================================
const shopRegister = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        if (!name || !phone || !password) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Mật khẩu' });
            return;
        }
        // Check if customer already exists by phone or email
        let customer = await Customer_1.default.findOne({ $or: [{ phone }, { email: email || '___none___' }] });
        if (customer) {
            if (customer.password) {
                res.status(400).json({ success: false, message: 'Số điện thoại hoặc Email này đã được đăng ký tài khoản' });
                return;
            }
            // Existing customer from POS/Admin, setting password now
            const salt = await bcryptjs_1.default.genSalt(10);
            customer.password = await bcryptjs_1.default.hash(password, salt);
            if (email)
                customer.email = email;
            if (name)
                customer.name = name;
            await customer.save();
        }
        else {
            // Create brand new customer
            const salt = await bcryptjs_1.default.genSalt(10);
            const hashedPassword = await bcryptjs_1.default.hash(password, salt);
            customer = await Customer_1.default.create({
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.shopRegister = shopRegister;
const shopLogin = async (req, res) => {
    try {
        const { loginKey, password } = req.body; // loginKey can be phone or email
        if (!loginKey || !password) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
            return;
        }
        const customer = await Customer_1.default.findOne({
            $or: [{ phone: loginKey }, { email: loginKey }]
        });
        if (!customer || !customer.password) {
            res.status(400).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, customer.password);
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.shopLogin = shopLogin;
const getShopProfile = async (req, res) => {
    try {
        const customer = await Customer_1.default.findById(req.customer?._id).select('-password');
        res.json({ success: true, data: customer });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopProfile = getShopProfile;
const updateShopProfile = async (req, res) => {
    try {
        const { name, email, gender, avatar, address } = req.body;
        const customer = await Customer_1.default.findById(req.customer?._id);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
            return;
        }
        if (name)
            customer.name = name;
        if (email)
            customer.email = email;
        if (gender)
            customer.gender = gender;
        if (avatar !== undefined)
            customer.avatar = avatar;
        if (address)
            customer.address = address;
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateShopProfile = updateShopProfile;
// CRUD customer addresses
const getAddresses = async (req, res) => {
    try {
        const customer = await Customer_1.default.findById(req.customer?._id);
        res.json({ success: true, data: customer?.addresses || [] });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getAddresses = getAddresses;
const addAddress = async (req, res) => {
    try {
        const customer = await Customer_1.default.findById(req.customer?._id);
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.addAddress = addAddress;
const updateAddress = async (req, res) => {
    try {
        const customer = await Customer_1.default.findById(req.customer?._id);
        if (!customer || !customer.addresses) {
            res.status(404).json({ success: false, message: 'Không tìm thấy thông tin' });
            return;
        }
        const addrId = req.params.id;
        const updatedFields = req.body;
        const addrIndex = customer.addresses.findIndex(addr => addr._id.toString() === addrId);
        if (addrIndex === -1) {
            res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại' });
            return;
        }
        if (updatedFields.isDefault) {
            customer.addresses.forEach(addr => addr.isDefault = false);
        }
        const addrObj = customer.addresses[addrIndex].toObject ? customer.addresses[addrIndex].toObject() : customer.addresses[addrIndex];
        customer.addresses[addrIndex] = { ...addrObj, ...updatedFields };
        await customer.save();
        res.json({ success: true, data: customer.addresses });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateAddress = updateAddress;
const deleteAddress = async (req, res) => {
    try {
        const customer = await Customer_1.default.findById(req.customer?._id);
        if (!customer || !customer.addresses) {
            res.status(404).json({ success: false, message: 'Không tìm thấy thông tin' });
            return;
        }
        const addrId = req.params.id;
        customer.addresses = customer.addresses.filter(addr => addr._id.toString() !== addrId);
        await customer.save();
        res.json({ success: true, data: customer.addresses });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deleteAddress = deleteAddress;
// ===========================================
// PRODUCTS & CATALOG API
// ===========================================
const getShopProducts = async (req, res) => {
    try {
        const { category, search, minPrice, maxPrice, sort, page = 1, limit = 20, isFeatured } = req.query;
        const query = { status: 'active' };
        // Category filter (supports parent/child)
        if (category) {
            const catId = category;
            const subCategories = await Category_1.default.find({ parentId: catId });
            const catIds = [catId, ...subCategories.map(c => c._id)];
            query.categoryIds = { $in: catIds };
        }
        // Search text
        if (search) {
            const keyword = search;
            query.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { sku: { $regex: keyword, $options: 'i' } }
            ];
        }
        // Price range
        if (minPrice || maxPrice) {
            query.priceSale = {};
            if (minPrice)
                query.priceSale.$gte = Number(minPrice);
            if (maxPrice)
                query.priceSale.$lte = Number(maxPrice);
        }
        // isFeatured
        if (isFeatured === 'true') {
            query.isFeatured = true;
        }
        // Sort configuration
        let sortOption = { createdAt: -1 };
        if (sort === 'priceAsc')
            sortOption = { priceSale: 1 };
        else if (sort === 'priceDesc')
            sortOption = { priceSale: -1 };
        else if (sort === 'newest')
            sortOption = { createdAt: -1 };
        else if (sort === 'bestseller')
            sortOption = { soldCount: -1 };
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const products = await Product_1.default.find(query)
            .populate('categoryIds', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);
        const total = await Product_1.default.countDocuments(query);
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopProducts = getShopProducts;
const getShopProductDetail = async (req, res) => {
    try {
        const product = await Product_1.default.findOne({ _id: req.params.id, status: 'active' })
            .populate('categoryIds', 'name');
        if (!product) {
            res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại hoặc đã dừng bán' });
            return;
        }
        // Related products in the same categories
        const related = await Product_1.default.find({
            _id: { $ne: product._id },
            categoryIds: { $in: product.categoryIds },
            status: 'active'
        }).limit(4);
        // Fetch applicable vouchers
        const now = new Date();
        const activeVouchers = await Promotion_1.default.find({
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopProductDetail = getShopProductDetail;
// Build tree structured categories
const getShopCategoriesTree = async (req, res) => {
    try {
        const categories = await Category_1.default.find({ status: 'active' }).lean();
        const parentCategories = categories.filter(c => !c.parentId);
        const tree = parentCategories.map(parent => {
            const children = categories.filter(c => c.parentId && c.parentId.toString() === parent._id.toString());
            return {
                ...parent,
                children
            };
        });
        res.json({ success: true, data: tree });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopCategoriesTree = getShopCategoriesTree;
// ===========================================
// PROMOTIONS & FLASH SALES
// ===========================================
const getShopPromotions = async (req, res) => {
    try {
        const now = new Date();
        const promotions = await Promotion_1.default.find({
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now }
        });
        res.json({ success: true, data: promotions });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopPromotions = getShopPromotions;
const getShopActiveFlashSale = async (req, res) => {
    try {
        const now = new Date();
        const flashSale = await FlashSale_1.default.findOne({
            status: 'active',
            startTime: { $lte: now },
            endTime: { $gte: now }
        }).populate('products.product');
        res.json({ success: true, data: flashSale });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopActiveFlashSale = getShopActiveFlashSale;
// ===========================================
// CHECKOUT & SHIPPING
// ===========================================
const getShopShippingConfigs = async (req, res) => {
    try {
        const config = await ShippingConfig_1.default.findOne({ status: 'active' });
        res.json({ success: true, data: config });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopShippingConfigs = getShopShippingConfigs;
const getShopBranches = async (req, res) => {
    try {
        // Warehouse branches configured as locations
        const locations = await Setting_1.default.findOne().select('addresses');
        res.json({ success: true, data: locations?.addresses || [] });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopBranches = getShopBranches;
const validateShopVoucher = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;
        if (!code) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã giảm giá' });
            return;
        }
        const now = new Date();
        const voucher = await Promotion_1.default.findOne({ code, status: 'active' });
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.validateShopVoucher = validateShopVoucher;
// Checkout order placing endpoint
const placeShopOrder = async (req, res) => {
    try {
        const { customer: customerId, items, shippingAddress, deliveryType, // 'shipping' | 'pickup'
        pickupBranch, // branch address if self-pickup
        paymentMethod, promotionCode, discountAmount = 0, shippingFee = 0, totalAmount, note } = req.body;
        if (!items || items.length === 0) {
            res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
            return;
        }
        // Generate WS orderCode
        const orderCode = 'WS' + Date.now().toString().slice(-8) + Math.floor(100 + Math.random() * 900);
        // Deduct inventory
        for (const item of items) {
            const product = await Product_1.default.findById(item.product);
            if (!product) {
                res.status(400).json({ success: false, message: `Sản phẩm với ID ${item.product} không tồn tại` });
                return;
            }
            const targetSku = item.variantSku || product.sku;
            // 1. Deduct from Warehouses (First active warehouse containing stock)
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
            product.soldCount = (product.soldCount || 0) + item.qty;
            await product.save();
        }
        // Increment promotion code usage
        if (promotionCode) {
            await Promotion_1.default.findOneAndUpdate({ code: promotionCode }, { $inc: { usedCount: 1 } });
        }
        // Record customer loyalty spending if customer is logged in
        if (customerId) {
            const customerDoc = await Customer_1.default.findById(customerId);
            if (customerDoc) {
                customerDoc.totalSpent = (customerDoc.totalSpent || 0) + totalAmount;
                await customerDoc.save();
            }
        }
        // Construct Note string with address if shipping
        let finalNote = note || '';
        if (deliveryType === 'pickup') {
            finalNote = `[Nhận tại cửa hàng: ${pickupBranch}] ${finalNote}`;
        }
        else if (shippingAddress) {
            const { name, phone, province, district, ward, detail } = shippingAddress;
            finalNote = `[Địa chỉ nhận: ${name} - ${phone} | ${detail}, ${ward}, ${district}, ${province}] ${finalNote}`;
        }
        const newOrder = await Order_1.default.create({
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.placeShopOrder = placeShopOrder;
// ===========================================
// CUSTOMER ORDER HISTORY
// ===========================================
const getShopOrders = async (req, res) => {
    try {
        const { status } = req.query;
        const query = { customer: req.customer?._id };
        if (status) {
            query.orderStatus = status;
        }
        const orders = await Order_1.default.find(query)
            .populate('items.product')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopOrders = getShopOrders;
const getShopOrderDetail = async (req, res) => {
    try {
        const order = await Order_1.default.findOne({ _id: req.params.id, customer: req.customer?._id })
            .populate('items.product');
        if (!order) {
            res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng của bạn' });
            return;
        }
        res.json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopOrderDetail = getShopOrderDetail;
const cancelShopOrder = async (req, res) => {
    try {
        const order = await Order_1.default.findOne({ _id: req.params.id, customer: req.customer?._id });
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
            const product = await Product_1.default.findById(item.product);
            if (!product)
                continue;
            const targetSku = item.variantSku || product.sku;
            // 1. Return to first active Warehouse
            const firstWarehouse = await Warehouse_1.default.findOne({ status: 'active' });
            if (firstWarehouse) {
                const whProductIndex = firstWarehouse.products.findIndex(p => p.productId.toString() === product._id.toString() &&
                    p.variantSku === targetSku);
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.cancelShopOrder = cancelShopOrder;
// General settings for storefront (logo, name, banners, footer maps)
const getShopStoreSettings = async (req, res) => {
    try {
        const settings = await Setting_1.default.findOne();
        res.json({ success: true, data: settings });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopStoreSettings = getShopStoreSettings;
