import { Request, Response } from 'express';
import Promotion from '../models/Promotion';

export const getPromotions = async (req: Request, res: Response): Promise<void> => {
    try {
        const promotions = await Promotion.find().populate('applyProductIds buyProductId getProductId', 'name sku').sort({ createdAt: -1 });
        res.json({ success: true, data: promotions });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const createPromotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const payload = { ...req.body };
        if (!payload.code || !payload.code.trim()) {
            payload.code = 'VC' + Math.random().toString(36).substring(2, 8).toUpperCase();
        } else {
            payload.code = payload.code.trim().toUpperCase();
        }
        const promotion = await Promotion.create(payload);
        res.status(201).json({ success: true, data: promotion });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const updatePromotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('applyProductIds buyProductId getProductId', 'name sku');
        res.json({ success: true, data: promotion });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const deletePromotion = async (req: Request, res: Response): Promise<void> => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
