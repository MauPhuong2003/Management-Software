import { Request, Response } from 'express';
import FlashSale from '../models/FlashSale';

export const getFlashSales = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const flashSales = await FlashSale.find()
            .populate('products.product')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await FlashSale.countDocuments();

        res.json({
            success: true,
            data: flashSales,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const createFlashSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const flashSale = await FlashSale.create(req.body);
        res.status(201).json({ success: true, data: flashSale });
    } catch (e: any) {
        res.status(400).json({ success: false, message: e.message });
    }
};

export const updateFlashSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const flashSale = await FlashSale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!flashSale) {
            res.status(404).json({ success: false, message: 'Không tìm thấy chiến dịch Flash Sale này' });
            return;
        }
        res.json({ success: true, data: flashSale });
    } catch (e: any) {
        res.status(400).json({ success: false, message: e.message });
    }
};

export const deleteFlashSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const flashSale = await FlashSale.findByIdAndDelete(req.params.id);
        if (!flashSale) {
            res.status(404).json({ success: false, message: 'Không tìm thấy chiến dịch Flash Sale này' });
            return;
        }
        res.json({ success: true, message: 'Đã xóa chiến dịch Flash Sale thành công' });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};
