"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shopController_1 = require("../controllers/shopController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// ===========================================
// PUBLIC STOREFRONT CONFIGS & PRODUCTS
// ===========================================
router.get('/settings', shopController_1.getShopStoreSettings);
router.get('/categories', shopController_1.getShopCategoriesTree);
router.get('/products', shopController_1.getShopProducts);
router.get('/products/:id', shopController_1.getShopProductDetail);
router.get('/promotions/active', shopController_1.getShopPromotions);
router.get('/flash-sales/active', shopController_1.getShopActiveFlashSale);
// ===========================================
// CHECKOUT & SHIPPING CONFIGS
// ===========================================
router.get('/checkout/shipping', shopController_1.getShopShippingConfigs);
router.get('/checkout/branches', shopController_1.getShopBranches);
router.post('/checkout/validate-voucher', shopController_1.validateShopVoucher);
router.post('/checkout/place-order', shopController_1.placeShopOrder);
// ===========================================
// CUSTOMER REGISTER & LOGIN (JWT)
// ===========================================
router.post('/auth/register', shopController_1.shopRegister);
router.post('/auth/login', shopController_1.shopLogin);
// ===========================================
// PROTECTED PROFILE & ADDRESSES
// ===========================================
router.get('/auth/profile', authMiddleware_1.protectCustomer, shopController_1.getShopProfile);
router.put('/auth/profile', authMiddleware_1.protectCustomer, shopController_1.updateShopProfile);
router.get('/auth/addresses', authMiddleware_1.protectCustomer, shopController_1.getAddresses);
router.post('/auth/addresses', authMiddleware_1.protectCustomer, shopController_1.addAddress);
router.put('/auth/addresses/:id', authMiddleware_1.protectCustomer, shopController_1.updateAddress);
router.delete('/auth/addresses/:id', authMiddleware_1.protectCustomer, shopController_1.deleteAddress);
// ===========================================
// PROTECTED CUSTOMER ORDERS
// ===========================================
router.get('/orders', authMiddleware_1.protectCustomer, shopController_1.getShopOrders);
router.get('/orders/:id', authMiddleware_1.protectCustomer, shopController_1.getShopOrderDetail);
router.post('/orders/:id/cancel', authMiddleware_1.protectCustomer, shopController_1.cancelShopOrder);
exports.default = router;
