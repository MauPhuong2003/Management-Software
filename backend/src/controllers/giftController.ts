import { Request, Response } from 'express';
import Gift from '../models/Gift';
import MiniGame from '../models/MiniGame';

// Get list of gifts (with pagination & search)
export const getGifts = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 100);
        const search = req.query.search as string | undefined;

        const filter: any = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const [records, total] = await Promise.all([
            Gift.find(filter)
                .populate('voucherId')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Gift.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: records,
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

// Create a new gift
export const createGift = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, image, quantity, prizeType, receiveMethod, expiryDays, voucherId } = req.body;
        
        const newGift = new Gift({
            name,
            image,
            quantity: Number(quantity) || 0,
            quantityRemaining: Number(quantity) || 0,
            prizeType,
            receiveMethod,
            expiryDays: Number(expiryDays) || 0,
            voucherId: voucherId || undefined
        });

        await newGift.save();
        res.json({ success: true, data: newGift });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Update a gift
export const updateGift = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, image, quantity, prizeType, receiveMethod, expiryDays, voucherId } = req.body;

        const gift = await Gift.findById(id);
        if (!gift) {
            res.status(404).json({ success: false, message: 'Không tìm thấy quà tặng' });
            return;
        }

        if (quantity !== undefined) {
            const newQty = Number(quantity) || 0;
            const oldQty = gift.quantity;
            const diff = newQty - oldQty;

            // Adjust remaining by the delta
            gift.quantityRemaining = Math.max(0, gift.quantityRemaining + diff);
            gift.quantity = newQty;
        }

        if (name !== undefined) gift.name = name;
        if (image !== undefined) gift.image = image;
        if (prizeType !== undefined) gift.prizeType = prizeType;
        if (receiveMethod !== undefined) gift.receiveMethod = receiveMethod;
        if (expiryDays !== undefined) gift.expiryDays = Number(expiryDays) || 0;
        
        if (voucherId !== undefined) {
            gift.voucherId = voucherId ? voucherId : undefined;
        }

        await gift.save();
        res.json({ success: true, data: gift });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Delete a gift
export const deleteGift = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Check if gift is in use in the MiniGame wheel configuration
        const minigameInUse = await MiniGame.findOne({ 'slots.giftId': id });
        if (minigameInUse) {
            res.status(400).json({ 
                success: false, 
                message: 'Quà tặng này đang được gán trên ô của Vòng Quay May Mắn. Không thể xóa!' 
            });
            return;
        }

        const gift = await Gift.findByIdAndDelete(id);
        if (!gift) {
            res.status(404).json({ success: false, message: 'Không tìm thấy quà tặng' });
            return;
        }

        res.json({ success: true, message: 'Xóa quà tặng thành công!' });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};
