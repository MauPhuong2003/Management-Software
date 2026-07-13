import { Router } from 'express';
import {
    getLoyaltyConfig,
    updateLoyaltyConfig,
    recalculateAllTiers,
    adjustCustomerPoints,
    backfillLoyaltyPoints,
    getCustomerPointHistory
} from '../controllers/loyaltyController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.get('/config', protect, authorize('loyalty_read'), getLoyaltyConfig);
router.put('/config', protect, authorize('loyalty_update'), updateLoyaltyConfig);
router.post('/recalculate', protect, authorize('loyalty_update'), recalculateAllTiers);
router.post('/adjust/:customerId', protect, authorize('customers_update'), adjustCustomerPoints); // manual adjust point is a customer modification action, so it checks customer_update
router.post('/backfill', protect, authorize('loyalty_update'), backfillLoyaltyPoints);
router.get('/history/:customerId', protect, authorize('customers_read'), getCustomerPointHistory);

export default router;
