import { Request, Response } from 'express';
import Setting from '../models/Setting';
import Role from '../models/Role';
import User from '../models/User';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }
        res.json({ success: true, data: settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await Setting.findOne();
        
        const updateData = { ...req.body };
        if (updateData.bankInfo) {
            const { bankName, accountNumber, accountHolder } = updateData.bankInfo;
            if (!bankName?.trim() || !accountNumber?.trim() || !accountHolder?.trim()) {
                updateData.bankInfo = null;
            }
        }

        if (settings) {
            settings = await Setting.findOneAndUpdate({}, updateData, { new: true, runValidators: true });
        } else {
            settings = await Setting.create(updateData);
        }
        res.json({ success: true, data: settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
        let roles = await Role.find();
        if (roles.length === 0) {
            const admin = await Role.create({
                name: 'Admin',
                description: 'Quản trị viên toàn hệ thống',
                permissions: [
                    'products_read', 'products_create', 'products_update', 'products_delete',
                    'orders_read', 'orders_create', 'orders_update', 'orders_delete',
                    'customers_read', 'customers_create', 'customers_update', 'customers_delete',
                    'pos_read', 'pos_create', 'pos_update', 'pos_delete',
                    'settings_read', 'settings_create', 'settings_update', 'settings_delete'
                ]
            });
            const manager = await Role.create({
                name: 'Manager',
                description: 'Quản lý chi nhánh cửa hàng',
                permissions: [
                    'products_read', 'products_create', 'products_update',
                    'orders_read', 'orders_create', 'orders_update',
                    'customers_read', 'customers_create', 'customers_update',
                    'pos_read', 'pos_create', 'pos_update'
                ]
            });
            const staff = await Role.create({
                name: 'Staff',
                description: 'Nhân viên bán hàng trực quầy',
                permissions: [
                    'products_read',
                    'orders_read', 'orders_create',
                    'customers_read', 'customers_create',
                    'pos_read', 'pos_create'
                ]
            });
            roles = [admin, manager, staff];
        }
        res.json({ success: true, data: roles });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, permissions } = req.body;
        const role = await Role.create({ name, description, permissions: permissions || [] });
        res.status(201).json({ success: true, data: role });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, permissions } = req.body;
        const role = await Role.findByIdAndUpdate(
            req.params.id,
            { name, description, permissions: permissions || [] },
            { new: true, runValidators: true }
        );
        if (!role) {
            res.status(404).json({ success: false, message: 'Role not found' });
            return;
        }
        res.json({ success: true, data: role });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const role = await Role.findByIdAndDelete(req.params.id);
        if (!role) {
            res.status(404).json({ success: false, message: 'Role not found' });
            return;
        }
        res.json({ success: true, message: 'Role deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find().populate('role', 'name description');
        res.json({ success: true, data: users });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, username, phone, email, password, role, status } = req.body;
        if (!username) {
            res.status(400).json({ success: false, message: 'Tên đăng nhập là bắt buộc' });
            return;
        }
        const existing = await User.findOne({ username: username.trim() });
        if (existing) {
            res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
            return;
        }

        const user = await User.create({ 
            name, 
            username: username.trim(),
            phone: phone || '',
            email: email || '',
            password, 
            role, 
            status: status || 'active' 
        });
        res.status(201).json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, username, phone, email, password, role, status } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (username && username.trim() !== user.username) {
            const existing = await User.findOne({ username: username.trim() });
            if (existing) {
                res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
                return;
            }
            user.username = username.trim();
        }

        user.name = name || user.name;
        user.phone = phone !== undefined ? phone : user.phone;
        user.email = email !== undefined ? email : user.email;
        user.role = role || user.role;
        user.status = status || user.status;
        
        if (password && password.trim() !== '') {
            user.password = password;
        }

        await user.save();
        res.json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, message: 'User deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
