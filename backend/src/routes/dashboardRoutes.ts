import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.get('/stats', protect, authorize('dashboard_read'), getDashboardStats);

export default router;
