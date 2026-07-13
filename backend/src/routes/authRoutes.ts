import express from 'express';
import { login, getMe } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);

export default router;
