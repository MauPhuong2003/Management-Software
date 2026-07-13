import express from 'express';
import {
    shopRegister,
    shopLogin,
    getShopProfile,
    updateShopProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getShopProducts,
    getShopProductDetail,
    getShopCategoriesTree,
    getShopPromotions,
    getShopActiveFlashSale,
    getShopShippingConfigs,
    getShopBranches,
    validateShopVoucher,
    placeShopOrder,
    getShopOrders,
    getShopOrderDetail,
    cancelShopOrder,
    getShopStoreSettings,
    shopForgotPassword,
    shopChangePassword,
    shopSendOTP,
    getShopLoyaltyConfig,
    getShopLoyaltyHistory
} from '../controllers/shopController';
import { protectCustomer } from '../middlewares/authMiddleware';

const router = express.Router();

// ===========================================
// PUBLIC STOREFRONT CONFIGS & PRODUCTS
// ===========================================
router.get('/settings', getShopStoreSettings);
router.get('/loyalty-config', getShopLoyaltyConfig);
router.get('/categories', getShopCategoriesTree);
router.get('/products', getShopProducts);
router.get('/products/:id', getShopProductDetail);
router.get('/promotions/active', getShopPromotions);
router.get('/flash-sales/active', getShopActiveFlashSale);

// ===========================================
// CHECKOUT & SHIPPING CONFIGS
// ===========================================
router.get('/checkout/shipping', getShopShippingConfigs);
router.get('/checkout/branches', getShopBranches);
router.post('/checkout/validate-voucher', validateShopVoucher);
router.post('/checkout/place-order', placeShopOrder);

// ===========================================
// CUSTOMER REGISTER & LOGIN (JWT)
// ===========================================
router.post('/auth/register', shopRegister);
router.post('/auth/login', shopLogin);
router.post('/auth/send-otp', shopSendOTP);
router.post('/auth/forgot-password', shopForgotPassword);

// ===========================================
// PROTECTED PROFILE & ADDRESSES
// ===========================================
router.get('/auth/profile', protectCustomer, getShopProfile);
router.put('/auth/profile', protectCustomer, updateShopProfile);
router.post('/auth/change-password', protectCustomer, shopChangePassword);
router.get('/auth/addresses', protectCustomer, getAddresses);
router.post('/auth/addresses', protectCustomer, addAddress);
router.put('/auth/addresses/:id', protectCustomer, updateAddress);
router.delete('/auth/addresses/:id', protectCustomer, deleteAddress);
router.get('/auth/loyalty-history', protectCustomer, getShopLoyaltyHistory);

// ===========================================
// PROTECTED CUSTOMER ORDERS
// ===========================================
router.get('/orders', protectCustomer, getShopOrders);
router.get('/orders/:id', protectCustomer, getShopOrderDetail);
router.post('/orders/:id/cancel', protectCustomer, cancelShopOrder);

export default router;
