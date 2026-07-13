import { Request, Response } from 'express';
import ShippingConfig from '../models/ShippingConfig';

export const getShipping = async (req: Request, res: Response): Promise<void> => {
    try {
        let config = await ShippingConfig.findOne();
        if (!config) config = await ShippingConfig.create({});
        res.json({ success: true, data: config });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const updateShipping = async (req: Request, res: Response): Promise<void> => {
    try {
        let config = await ShippingConfig.findOne();
        if (config) config = await ShippingConfig.findOneAndUpdate({}, req.body, { new: true });
        else config = await ShippingConfig.create(req.body);
        res.json({ success: true, data: config });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
