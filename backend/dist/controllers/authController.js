"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
require("../models/Role"); // Đăng ký schema Role cho Mongoose populate
const generateTokens = (id) => {
    const accessToken = jsonwebtoken_1.default.sign({ id }, process.env.JWT_ACCESS_SECRET || 'secret');
    const refreshToken = jsonwebtoken_1.default.sign({ id }, process.env.JWT_REFRESH_SECRET || 'secret2');
    return { accessToken, refreshToken };
};
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User_1.default.findOne({ username }).populate('role');
        if (user && (await user.matchPassword(password))) {
            if (user.status !== 'active') {
                res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
                return;
            }
            const tokens = generateTokens(user.id);
            res.json({
                success: true,
                data: {
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    ...tokens
                }
            });
        }
        else {
            res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    res.json({ success: true, data: req.user });
};
exports.getMe = getMe;
// ... Thêm logic refresh token, register nếu cần
