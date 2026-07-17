import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import Role from '../models/Role';

interface AuthRequest extends Request {
    user?: IUser;
    rolePermissions?: string[];
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret') as any;
            
            const user = await User.findById(decoded.id).select('-password').populate('role');
            if (!user) {
                res.status(401).json({ success: false, message: 'Người dùng không tồn tại' });
                return;
            }
            
            req.user = user;
            req.rolePermissions = (user.role as any).permissions || [];
            next();
        } catch (error) {
            res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Không có token truy cập' });
    }
};

export const authorize = (...permissions: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.rolePermissions) {
            res.status(403).json({ success: false, message: 'Forbidden' });
            return;
        }

        const hasPermission = permissions.some(p => req.rolePermissions?.includes(p));
        const isAdmin = (req.user as any)?.role?.name === 'Admin';
        
        if (isAdmin || req.rolePermissions?.includes('all') || hasPermission) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Không có quyền truy cập module này' });
        }
    };
};

import Customer, { ICustomer } from '../models/Customer';

export interface CustomerAuthRequest extends Request {
    customer?: ICustomer;
}

export const protectCustomer = async (req: CustomerAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret') as any;
            
            const customer = await Customer.findById(decoded.id);
            if (!customer) {
                res.status(401).json({ success: false, message: 'Tài khoản khách hàng không tồn tại' });
                return;
            }
            
            req.customer = customer;
            next();
        } catch (error) {
            res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Không tìm thấy token đăng nhập' });
    }
};

export const optionalProtectCustomer = async (req: CustomerAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret') as any;
            const customer = await Customer.findById(decoded.id);
            if (customer) {
                req.customer = customer;
            }
        } catch (error) {
            // Ignore jwt verification errors for optional auth
        }
    }
    next();
};
