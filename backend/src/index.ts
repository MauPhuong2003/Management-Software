import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import connectDB from './config/db';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({
    crossOriginResourcePolicy: false // Cho phép load ảnh từ các nguồn khác
}));
app.use(morgan('dev'));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import authRoutes from './routes/authRoutes';
import settingRoutes from './routes/settingRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import warehouseRoutes from './routes/warehouseRoutes';
import shippingRoutes from './routes/shippingRoutes';
import orderRoutes from './routes/orderRoutes';
import customerRoutes from './routes/customerRoutes';
import promotionRoutes from './routes/promotionRoutes';
import uploadRoutes from './routes/uploadRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import loyaltyRoutes from './routes/loyaltyRoutes';
import flashSaleRoutes from './routes/flashSaleRoutes';
import shopRoutes from './routes/shopRoutes';
import miniGameRoutes from './routes/miniGameRoutes';
import giftRoutes from './routes/giftRoutes';

// Database connection
connectDB();

// Routes
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/settings', settingRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/warehouses', warehouseRoutes);
app.use('/api/admin/shipping', shippingRoutes);
app.use('/api/admin/orders', orderRoutes);
app.use('/api/admin/customers', customerRoutes);
app.use('/api/admin/promotions', promotionRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/loyalty', loyaltyRoutes);
app.use('/api/admin/flash-sales', flashSaleRoutes);
app.use('/api/admin/minigame', miniGameRoutes);
app.use('/api/admin/gifts', giftRoutes);
app.use('/api/shop', shopRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('SaaS Admin API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
