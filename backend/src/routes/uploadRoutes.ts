import express, { Request, Response } from 'express';
import { upload } from '../middlewares/uploadMiddleware';
import { protect, protectCustomer } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect, upload.single('image'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh' });
            return;
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            data: {
                url: fileUrl,
                filename: req.file.filename
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/customer', protectCustomer as any, upload.single('image'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh' });
            return;
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            fileUrl,
            data: {
                url: fileUrl,
                filename: req.file.filename
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
