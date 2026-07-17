"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoles = exports.updateSettings = exports.getSettings = void 0;
const Setting_1 = __importDefault(require("../models/Setting"));
const Role_1 = __importDefault(require("../models/Role"));
const User_1 = __importDefault(require("../models/User"));
const getSettings = async (req, res) => {
    try {
        let settings = await Setting_1.default.findOne();
        if (!settings) {
            settings = await Setting_1.default.create({});
        }
        res.json({ success: true, data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        let settings = await Setting_1.default.findOne();
        const updateData = { ...req.body };
        if (updateData.bankInfo) {
            const { bankName, accountNumber, accountHolder } = updateData.bankInfo;
            if (!bankName?.trim() || !accountNumber?.trim() || !accountHolder?.trim()) {
                updateData.bankInfo = null;
            }
        }
        if (settings) {
            settings = await Setting_1.default.findOneAndUpdate({}, updateData, { new: true, runValidators: true });
        }
        else {
            settings = await Setting_1.default.create(updateData);
        }
        res.json({ success: true, data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSettings = updateSettings;
const getRoles = async (req, res) => {
    try {
        let roles = await Role_1.default.find();
        if (roles.length === 0) {
            const admin = await Role_1.default.create({
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
            const manager = await Role_1.default.create({
                name: 'Manager',
                description: 'Quản lý chi nhánh cửa hàng',
                permissions: [
                    'products_read', 'products_create', 'products_update',
                    'orders_read', 'orders_create', 'orders_update',
                    'customers_read', 'customers_create', 'customers_update',
                    'pos_read', 'pos_create', 'pos_update'
                ]
            });
            const staff = await Role_1.default.create({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRoles = getRoles;
const createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await Role_1.default.create({ name, description, permissions: permissions || [] });
        res.status(201).json({ success: true, data: role });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await Role_1.default.findByIdAndUpdate(req.params.id, { name, description, permissions: permissions || [] }, { new: true, runValidators: true });
        if (!role) {
            res.status(404).json({ success: false, message: 'Role not found' });
            return;
        }
        res.json({ success: true, data: role });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    try {
        const role = await Role_1.default.findByIdAndDelete(req.params.id);
        if (!role) {
            res.status(404).json({ success: false, message: 'Role not found' });
            return;
        }
        res.json({ success: true, message: 'Role deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteRole = deleteRole;
const getUsers = async (req, res) => {
    try {
        const users = await User_1.default.find().populate('role', 'name description');
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const { name, username, phone, email, password, role, status } = req.body;
        if (!username) {
            res.status(400).json({ success: false, message: 'Tên đăng nhập là bắt buộc' });
            return;
        }
        const existing = await User_1.default.findOne({ username: username.trim() });
        if (existing) {
            res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
            return;
        }
        const user = await User_1.default.create({
            name,
            username: username.trim(),
            phone: phone || '',
            email: email || '',
            password,
            role,
            status: status || 'active'
        });
        res.status(201).json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { name, username, phone, email, password, role, status } = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        if (username && username.trim() !== user.username) {
            const existing = await User_1.default.findOne({ username: username.trim() });
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndDelete(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, message: 'User deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteUser = deleteUser;
