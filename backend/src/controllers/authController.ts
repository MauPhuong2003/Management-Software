import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import '../models/Role'; // Đăng ký schema Role cho Mongoose populate

const generateTokens = (id: string) => {
    const accessToken = jwt.sign({ id }, process.env.JWT_ACCESS_SECRET || 'secret');
    const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'secret2');
    return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;
    
    try {
        const user = await User.findOne({ username }).populate('role');
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
        } else {
            res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
    res.json({ success: true, data: req.user });
};

// ... Thêm logic refresh token, register nếu cần
