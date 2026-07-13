import express from 'express';
import { getShipping, updateShipping } from '../controllers/shippingController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();
router.route('/')
    .get(protect, authorize('shipping_read'), getShipping)
    .put(protect, authorize('shipping_update'), updateShipping);

export default router;
