"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitShopOrderPaymentProof = exports.requestShopOrderReturn = exports.getShopLoyaltyConfig = exports.shopChangePassword = exports.shopForgotPassword = exports.shopSendOTP = exports.getShopStoreSettings = exports.cancelShopOrder = exports.getShopOrderDetail = exports.getShopOrders = exports.placeShopOrder = exports.validateShopVoucher = exports.getShopBranches = exports.getShopShippingConfigs = exports.getShopActiveFlashSale = exports.getShopPromotions = exports.getShopCategoriesTree = exports.getShopProductDetail = exports.getShopProducts = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAddresses = exports.updateShopProfile = exports.getShopLoyaltyHistory = exports.getShopProfile = exports.shopLogin = exports.shopRegister = void 0;
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
const LoyaltyConfig_1 = __importDefault(require("../models/LoyaltyConfig"));
const PointHistory_1 = __importDefault(require("../models/PointHistory"));
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
const getShopLoyaltyHistory = async (req, res) => {
    try {
        const history = await PointHistory_1.default.find({ customer: req.customer?._id })
            .populate('order', 'orderCode totalAmount')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: history });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopLoyaltyHistory = getShopLoyaltyHistory;
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
        else if (sort === 'bestseller') {
            sortOption = { soldCount: -1 };
            query.soldCount = { $gt: 0 };
        }
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
        // Live sync warehouse stock for this product
        const warehouses = await Warehouse_1.default.find({ status: 'active' });
        const skuStockMap = {};
        let totalWhStockForProduct = 0;
        for (const wh of warehouses) {
            for (const item of wh.products) {
                if (item.productId && item.productId.toString() === product._id.toString()) {
                    totalWhStockForProduct += item.stock;
                    if (item.variantSku) {
                        skuStockMap[item.variantSku] = (skuStockMap[item.variantSku] || 0) + item.stock;
                    }
                }
            }
        }
        let isUpdated = false;
        if (product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
                const whStock = skuStockMap[variant.sku];
                if (whStock !== undefined && variant.stock !== whStock) {
                    variant.stock = whStock;
                    isUpdated = true;
                }
                else if (whStock === undefined && totalWhStockForProduct > 0 && variant.stock === 0) {
                    variant.stock = totalWhStockForProduct;
                    isUpdated = true;
                }
            }
        }
        else {
            if (totalWhStockForProduct > 0) {
                product.variants = [{
                        sku: product.sku,
                        price: product.priceSale,
                        priceCompare: product.priceCompare,
                        stock: totalWhStockForProduct,
                        barcode: '',
                        weight: 0,
                        status: 'active',
                        image: product.images?.[0] || '',
                        attributes: []
                    }];
                isUpdated = true;
            }
        }
        if (isUpdated) {
            product.markModified('variants');
            await product.save();
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
        const customer = req.customer;
        const query = {
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now }
        };
        if (customer && customer.vouchers && customer.vouchers.length > 0) {
            query.$or = [
                { isVisible: { $ne: false } },
                { _id: { $in: customer.vouchers } }
            ];
        }
        else {
            query.isVisible = { $ne: false };
        }
        const promotions = await Promotion_1.default.find(query)
            .populate('applyProductIds buyProductId getProductId', 'name sku')
            .lean();
        const data = promotions.map((p) => ({
            ...p,
            isPersonalVoucher: customer?.vouchers?.some(vId => vId.toString() === p._id.toString()) || false
        }));
        res.json({ success: true, data });
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
        if (flashSale) {
            const plainSale = flashSale.toObject();
            plainSale.products = plainSale.products.filter((p) => p.active && p.product);
            res.json({ success: true, data: plainSale });
            return;
        }
        res.json({ success: true, data: null });
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
        const { code, orderAmount, items } = req.body;
        if (!code) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã giảm giá' });
            return;
        }
        const now = new Date();
        const voucher = await Promotion_1.default.findOne({ code, status: 'active' }).populate('applyProductIds buyProductId getProductId', 'name sku');
        if (!voucher) {
            res.status(400).json({ success: false, message: 'Mã giảm giá không tồn tại hoặc đã tắt' });
            return;
        }
        // Validate minigame only voucher ownership (isVisible === false)
        if (voucher.isVisible === false) {
            let customerId = null;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'secret');
                    customerId = decoded.id;
                }
                catch (e) { }
            }
            if (!customerId) {
                res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để sử dụng mã giảm giá này' });
                return;
            }
            const customer = await Customer_1.default.findById(customerId);
            if (!customer || !customer.vouchers || !customer.vouchers.some(vId => vId.toString() === voucher._id.toString())) {
                res.status(400).json({ success: false, message: 'Mã giảm giá này chỉ dành cho người quay trúng trong MiniGame!' });
                return;
            }
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
                res.status(400).json({ success: false, message: 'Chương trình mua X giảm % Y yêu cầu có sản phẩm trong giỏ hàng.' });
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
            const buyQtyNeeded = voucher.buyQty || 1;
            if (!buyItem || buyItem.qty < buyQtyNeeded) {
                res.status(400).json({ success: false, message: `Mã giảm giá yêu cầu mua tối thiểu ${buyQtyNeeded} sản phẩm điều kiện.` });
                return;
            }
            // Find Product Y from DB if missing from cart
            let productYDoc = null;
            if (getItem) {
                productYDoc = typeof getItem.product === 'object' ? getItem.product : await Product_1.default.findById(getProdId).lean();
            }
            else if (getProdId) {
                productYDoc = await Product_1.default.findById(getProdId).lean();
            }
            if (!productYDoc) {
                res.status(400).json({ success: false, message: `Sản phẩm nhận ưu đãi (Y) không tồn tại.` });
                return;
            }
            // Calculate multiplier for recursive mode
            let multiplier = 1;
            if (voucher.isRecursive) {
                multiplier = Math.floor(buyItem.qty / buyQtyNeeded);
            }
            const yPercent = voucher.discountYValue || voucher.value || 100;
            const getItemPrice = productYDoc.priceSale || productYDoc.priceCompare || getItem?.price || 0;
            const singleYDiscount = Math.floor((getItemPrice * yPercent) / 100);
            const eligibleYQty = getItem ? Math.min(getItem.qty, multiplier) : multiplier;
            const calculatedDiscount = singleYDiscount * eligibleYQty;
            res.json({
                success: true,
                data: {
                    ...voucher.toObject(),
                    buyProductId: voucher.buyProductId,
                    getProductId: productYDoc,
                    calculatedDiscount,
                    multiplier,
                    eligibleYQty,
                    giftProduct: {
                        product: productYDoc,
                        variantSku: productYDoc.sku || null,
                        qty: multiplier,
                        price: Math.floor(getItemPrice * (100 - yPercent) / 100),
                        isGift: true,
                        giftNote: 'Sản phẩm này được tặng kèm'
                    }
                }
            });
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
        paymentMethod, promotionCode, promotionCodes, discountAmount = 0, tierDiscountAmount = 0, shippingFee = 0, totalAmount, note } = req.body;
        // Support both single promotionCode (legacy) and promotionCodes array
        const allPromoCodes = [
            ...(Array.isArray(promotionCodes) ? promotionCodes : []),
            ...(promotionCode ? [promotionCode] : [])
        ].filter(Boolean);
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
            // 3. Update Flash Sale soldQty if there is an active campaign
            const now = new Date();
            const activeFlashCampaign = await FlashSale_1.default.findOne({
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
        // Increment usage count for all applied promotion codes and remove used vouchers from customer profile
        if (allPromoCodes.length > 0) {
            const usedPromos = await Promotion_1.default.find({ code: { $in: allPromoCodes } });
            await Promotion_1.default.updateMany({ code: { $in: allPromoCodes } }, { $inc: { usedCount: 1 } });
            if (customerId && usedPromos.length > 0) {
                const usedPromoIds = usedPromos.map(p => p._id);
                await Customer_1.default.findByIdAndUpdate(customerId, {
                    $pull: { vouchers: { $in: usedPromoIds } }
                });
            }
        }
        // Award loyalty points and upgrade tier for logged-in customers
        if (customerId) {
            const customerDoc = await Customer_1.default.findById(customerId);
            if (customerDoc) {
                customerDoc.totalSpent = (customerDoc.totalSpent || 0) + totalAmount;
                // Fetch loyalty config
                const loyaltyConf = await LoyaltyConfig_1.default.findOne();
                if (loyaltyConf && loyaltyConf.isActive) {
                    const shouldEarn = loyaltyConf.applyToOrders === 'all' || loyaltyConf.applyToOrders === 'website';
                    if (shouldEarn) {
                        const vndPerPoint = loyaltyConf.vndToEarnOnePoint || 100000;
                        const activeTiers = loyaltyConf.tiers.filter(t => t.isActive !== false).sort((a, b) => b.minPoints - a.minPoints);
                        // Find customer tier multiplier by name first, fallback to points
                        let currentTier = loyaltyConf.tiers.find(t => t.name.toLowerCase() === customerDoc.tier.toLowerCase() && t.isActive !== false);
                        if (!currentTier) {
                            currentTier = activeTiers.find(t => (customerDoc.loyaltyPoints || 0) >= t.minPoints);
                        }
                        const multiplier = currentTier?.pointMultiplier || 1;
                        const earnedPoints = Math.floor((totalAmount / vndPerPoint) * multiplier);
                        customerDoc.loyaltyPoints = (customerDoc.loyaltyPoints || 0) + earnedPoints;
                        // Upgrade tier based on new point total
                        const newTier = activeTiers.find(t => customerDoc.loyaltyPoints >= t.minPoints);
                        if (newTier)
                            customerDoc.tier = newTier.name;
                    }
                }
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
            promotionCode: allPromoCodes.length > 0 ? allPromoCodes.join(', ') : null,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            orderSource: 'website',
            note: finalNote,
            deliveryType: deliveryType || 'shipping',
            pickupBranch: deliveryType === 'pickup' ? pickupBranch : null
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
const shopSendOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập Số điện thoại để nhận mã OTP' });
            return;
        }
        const customer = await Customer_1.default.findOne({ phone: phone.trim() });
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.shopSendOTP = shopSendOTP;
const shopForgotPassword = async (req, res) => {
    try {
        const { phone, otpCode, newPassword } = req.body;
        if (!phone || !otpCode || !newPassword) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ Số điện thoại, Mã OTP và Mật khẩu mới' });
            return;
        }
        const customer = await Customer_1.default.findOne({ phone: phone.trim() });
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
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, salt);
        customer.password = hashedPassword;
        customer.otpCode = undefined;
        customer.otpExpireTime = undefined;
        await customer.save();
        res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại!' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.shopForgotPassword = shopForgotPassword;
const shopChangePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới' });
            return;
        }
        const customerId = req.customer?._id;
        const customer = await Customer_1.default.findById(customerId);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản' });
            return;
        }
        if (!customer.password) {
            res.status(400).json({ success: false, message: 'Tài khoản chưa được thiết lập mật khẩu' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(oldPassword, customer.password);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, salt);
        customer.password = hashedPassword;
        await customer.save();
        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.shopChangePassword = shopChangePassword;
// ===========================================
// PUBLIC LOYALTY CONFIG (for storefront)
// ===========================================
const getShopLoyaltyConfig = async (req, res) => {
    try {
        const config = await LoyaltyConfig_1.default.findOne();
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShopLoyaltyConfig = getShopLoyaltyConfig;
const requestShopOrderReturn = async (req, res) => {
    try {
        const { reason, images } = req.body;
        if (!reason || reason.trim() === '') {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do hoàn trả cụ thể' });
            return;
        }
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            return;
        }
        // Verify ownership
        if (order.customer?.toString() !== req.customer?._id?.toString()) {
            res.status(403).json({ success: false, message: 'Bạn không có quyền yêu cầu hoàn hàng cho đơn hàng này' });
            return;
        }
        // Only delivered orders can be returned
        if (order.orderStatus !== 'delivered') {
            res.status(400).json({ success: false, message: 'Chỉ có thể yêu cầu hoàn trả cho đơn hàng đã giao thành công' });
            return;
        }
        order.returnRequest = {
            reason,
            images: images || [],
            status: 'pending',
            adminComment: '',
            createdAt: new Date()
        };
        await order.save();
        res.json({ success: true, message: 'Gửi yêu cầu hoàn hàng thành công', data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.requestShopOrderReturn = requestShopOrderReturn;
const submitShopOrderPaymentProof = async (req, res) => {
    try {
        const { paymentProof } = req.body;
        if (!paymentProof || paymentProof.trim() === '') {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp hình ảnh minh chứng chuyển khoản' });
            return;
        }
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            return;
        }
        // Verify ownership
        if (order.customer?.toString() !== req.customer?._id?.toString()) {
            res.status(403).json({ success: false, message: 'Bạn không có quyền gửi minh chứng cho đơn hàng này' });
            return;
        }
        // Must be bank transfer payment method
        if (order.paymentMethod !== 'bank_transfer') {
            res.status(400).json({ success: false, message: 'Chỉ đơn hàng chuyển khoản mới cần gửi minh chứng' });
            return;
        }
        order.paymentProof = paymentProof;
        order.paymentProofSubmittedAt = new Date();
        await order.save();
        res.json({ success: true, message: 'Gửi minh chứng chuyển khoản thành công', data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.submitShopOrderPaymentProof = submitShopOrderPaymentProof;
