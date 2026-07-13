import express from 'express';
import { getFlashSales, createFlashSale, updateFlashSale, deleteFlashSale } from '../controllers/flashSaleController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, authorize('promotions_read'), getFlashSales)
    .post(protect, authorize('promotions_create'), createFlashSale);

router.route('/:id')
    .put(protect, authorize('promotions_update'), updateFlashSale)
    .delete(protect, authorize('promotions_delete'), deleteFlashSale);

export default router;
