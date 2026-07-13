"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loyaltyController_1 = require("../controllers/loyaltyController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/config', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('loyalty_read'), loyaltyController_1.getLoyaltyConfig);
router.put('/config', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('loyalty_update'), loyaltyController_1.updateLoyaltyConfig);
router.post('/recalculate', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('loyalty_update'), loyaltyController_1.recalculateAllTiers);
router.post('/adjust/:customerId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('customers_update'), loyaltyController_1.adjustCustomerPoints); // manual adjust point is a customer modification action, so it checks customer_update
router.post('/backfill', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('loyalty_update'), loyaltyController_1.backfillLoyaltyPoints);
exports.default = router;
