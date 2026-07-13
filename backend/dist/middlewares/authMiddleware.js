"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectCustomer = exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'secret');
            const user = await User_1.default.findById(decoded.id).select('-password').populate('role');
            if (!user) {
                res.status(401).json({ success: false, message: 'Người dùng không tồn tại' });
                return;
            }
            req.user = user;
            req.rolePermissions = user.role.permissions || [];
            next();
        }
        catch (error) {
            res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
    }
    else {
        res.status(401).json({ success: false, message: 'Không có token truy cập' });
    }
};
exports.protect = protect;
const authorize = (...permissions) => {
    return (req, res, next) => {
        if (!req.rolePermissions) {
            res.status(403).json({ success: false, message: 'Forbidden' });
            return;
        }
        const hasPermission = permissions.some(p => req.rolePermissions?.includes(p));
        const isAdmin = req.user?.role?.name === 'Admin';
        if (isAdmin || req.rolePermissions?.includes('all') || hasPermission) {
            next();
        }
        else {
            res.status(403).json({ success: false, message: 'Không có quyền truy cập module này' });
        }
    };
};
exports.authorize = authorize;
const Customer_1 = __importDefault(require("../models/Customer"));
const protectCustomer = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'secret');
            const customer = await Customer_1.default.findById(decoded.id);
            if (!customer) {
                res.status(401).json({ success: false, message: 'Tài khoản khách hàng không tồn tại' });
                return;
            }
            req.customer = customer;
            next();
        }
        catch (error) {
            res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
        }
    }
    else {
        res.status(401).json({ success: false, message: 'Không tìm thấy token đăng nhập' });
    }
};
exports.protectCustomer = protectCustomer;
