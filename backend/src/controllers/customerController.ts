import { Request, Response } from 'express';
import Customer from '../models/Customer';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const customers = await Customer.find().skip(skip).limit(limit).sort({ createdAt: -1 });
        const total = await Customer.countDocuments();

        res.json({
            success: true,
            data: customers,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json({ success: true, data: customer });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: customer });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};
