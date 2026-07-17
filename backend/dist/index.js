"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("./config/db"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false // Cho phép load ảnh từ các nguồn khác
}));
app.use((0, morgan_1.default)('dev'));
// Static uploads folder
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const settingRoutes_1 = __importDefault(require("./routes/settingRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const warehouseRoutes_1 = __importDefault(require("./routes/warehouseRoutes"));
const shippingRoutes_1 = __importDefault(require("./routes/shippingRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const promotionRoutes_1 = __importDefault(require("./routes/promotionRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const loyaltyRoutes_1 = __importDefault(require("./routes/loyaltyRoutes"));
const flashSaleRoutes_1 = __importDefault(require("./routes/flashSaleRoutes"));
const shopRoutes_1 = __importDefault(require("./routes/shopRoutes"));
const miniGameRoutes_1 = __importDefault(require("./routes/miniGameRoutes"));
const giftRoutes_1 = __importDefault(require("./routes/giftRoutes"));
// Database connection
(0, db_1.default)();
// Routes
app.use('/api/admin/auth', authRoutes_1.default);
app.use('/api/admin/settings', settingRoutes_1.default);
app.use('/api/admin/categories', categoryRoutes_1.default);
app.use('/api/admin/products', productRoutes_1.default);
app.use('/api/admin/warehouses', warehouseRoutes_1.default);
app.use('/api/admin/shipping', shippingRoutes_1.default);
app.use('/api/admin/orders', orderRoutes_1.default);
app.use('/api/admin/customers', customerRoutes_1.default);
app.use('/api/admin/promotions', promotionRoutes_1.default);
app.use('/api/admin/upload', uploadRoutes_1.default);
app.use('/api/admin/dashboard', dashboardRoutes_1.default);
app.use('/api/admin/loyalty', loyaltyRoutes_1.default);
app.use('/api/admin/flash-sales', flashSaleRoutes_1.default);
app.use('/api/admin/minigame', miniGameRoutes_1.default);
app.use('/api/admin/gifts', giftRoutes_1.default);
app.use('/api/shop', shopRoutes_1.default);
app.get('/', (req, res) => {
    res.send('SaaS Admin API is running...');
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
