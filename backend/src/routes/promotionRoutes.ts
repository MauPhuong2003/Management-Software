import express from 'express';
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from '../controllers/promotionController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, authorize('promotions_read'), getPromotions)
    .post(protect, authorize('promotions_create'), createPromotion);

router.route('/:id')
    .put(protect, authorize('promotions_update'), updatePromotion)
    .delete(protect, authorize('promotions_delete'), deletePromotion);

export default router;
