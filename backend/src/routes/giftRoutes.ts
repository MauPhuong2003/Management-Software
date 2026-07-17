import { Router } from 'express';
import { getGifts, createGift, updateGift, deleteGift } from '../controllers/giftController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', protect, getGifts);
router.post('/', protect, createGift);
router.put('/:id', protect, updateGift);
router.delete('/:id', protect, deleteGift);

export default router;
