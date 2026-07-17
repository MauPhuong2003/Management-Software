import express from 'express';
import { getOrders, createOrder, updateOrderStatus, approveOrderReturn, rejectOrderReturn } from '../controllers/orderController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();
router.route('/')
    .get(protect, authorize('orders_read'), getOrders)
    .post(protect, authorize('orders_create', 'pos_create'), createOrder);

router.route('/:id/status')
    .patch(protect, authorize('orders_update'), updateOrderStatus);

router.route('/:id/return/approve')
    .post(protect, authorize('orders_update'), approveOrderReturn);

router.route('/:id/return/reject')
    .post(protect, authorize('orders_update'), rejectOrderReturn);

export default router;
