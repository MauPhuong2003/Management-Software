import { Router } from 'express';
import {
    getMiniGame,
    upsertMiniGame,
    toggleMiniGame,
    getSpinHistory,
    updateRewardStatus,
    resetSlotQuantity,
    getActiveMiniGame,
    exchangePointsForSpins,
    spinWheel,
    getCustomerSpinHistory
} from '../controllers/miniGameController';
import { protect, protectCustomer } from '../middlewares/authMiddleware';

const router = Router();

// ──────────────────────────────────────────────
// Admin routes (protected by admin JWT)
// ──────────────────────────────────────────────
router.get('/', protect, getMiniGame);
router.post('/', protect, upsertMiniGame);
router.put('/toggle', protect, toggleMiniGame);
router.get('/history', protect, getSpinHistory);
router.put('/history/:historyId/reward', protect, updateRewardStatus);
router.put('/slots/:slotId/reset', protect, resetSlotQuantity);

// ──────────────────────────────────────────────
// Re-export shop handlers for use in shopRoutes.ts
// ──────────────────────────────────────────────
export { getActiveMiniGame, exchangePointsForSpins, spinWheel, getCustomerSpinHistory };
export default router;
