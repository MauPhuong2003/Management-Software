"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Role_1 = __importDefault(require("../models/Role"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const seedData = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_admin');
        console.log('MongoDB connected for seeding...');
        await Role_1.default.deleteMany();
        await User_1.default.deleteMany();
        const adminRole = await Role_1.default.create({
            name: 'Admin',
            description: 'Quản trị viên cấp cao nhất',
            permissions: ['all']
        });
        await User_1.default.create({
            name: 'Super Admin',
            email: 'admin@saas.com',
            password: 'password123',
            role: adminRole._id,
            status: 'active'
        });
        console.log('Admin user seeded successfully! Email: admin@saas.com / Pass: password123');
        process.exit();
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
};
seedData();
