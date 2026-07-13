import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role';
import User from '../models/User';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_admin');
        console.log('MongoDB connected for seeding...');

        await Role.deleteMany();
        await User.deleteMany();

        const adminRole = await Role.create({
            name: 'Admin',
            description: 'Quản trị viên cấp cao nhất',
            permissions: ['all']
        });

        await User.create({
            name: 'Super Admin',
            email: 'admin@saas.com',
            password: 'password123',
            role: adminRole._id,
            status: 'active'
        });

        console.log('Admin user seeded successfully! Email: admin@saas.com / Pass: password123');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
