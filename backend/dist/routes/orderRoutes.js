"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('orders_read'), orderController_1.getOrders)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('orders_create', 'pos_create'), orderController_1.createOrder);
router.route('/:id/status')
    .patch(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('orders_update'), orderController_1.updateOrderStatus);
router.route('/:id/return/approve')
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('orders_update'), orderController_1.approveOrderReturn);
router.route('/:id/return/reject')
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('orders_update'), orderController_1.rejectOrderReturn);
exports.default = router;
