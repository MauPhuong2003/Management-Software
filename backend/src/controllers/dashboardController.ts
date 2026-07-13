import { Request, Response } from 'express';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Product from '../models/Product';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = 'week' } = req.query;

        // Compute date range
        const now = new Date();
        let startDate: Date;
        if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else {
            // week: last 7 days
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
        }

        // --- KPI Cards ---
        const [totalCustomers, totalOrders, revenueAgg, productsSoldAgg] = await Promise.all([
            Customer.countDocuments(),
            Order.countDocuments(),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $unwind: '$items' },
                { $group: { _id: null, total: { $sum: '$items.qty' } } }
            ])
        ]);

        const totalRevenue = revenueAgg[0]?.total || 0;
        const totalProductsSold = productsSoldAgg[0]?.total || 0;

        // --- Revenue chart: group by day (week) or month (year) ---
        let revenueChart: { name: string; sales: number }[] = [];

        if (period === 'week') {
            // Last 7 days
            const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const rawRevenue = await Order.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dayOfWeek: '$createdAt' }, // 1=Sun, 2=Mon, ...7=Sat
                        sales: { $sum: '$totalAmount' }
                    }
                }
            ]);
            const revenueMap: Record<number, number> = {};
            rawRevenue.forEach(r => { revenueMap[r._id] = r.sales; });

            // Build last 7 days starting from (today-6)
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dow = d.getDay(); // 0=Sun
                const mongoDoW = dow + 1; // mongo: 1=Sun
                revenueChart.push({ name: days[dow], sales: revenueMap[mongoDoW] || 0 });
            }
        } else if (period === 'month') {
            // Days of current month
            const rawRevenue = await Order.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dayOfMonth: '$createdAt' },
                        sales: { $sum: '$totalAmount' }
                    }
                }
            ]);
            const revenueMap: Record<number, number> = {};
            rawRevenue.forEach(r => { revenueMap[r._id] = r.sales; });

            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                revenueChart.push({ name: `${d}`, sales: revenueMap[d] || 0 });
            }
        } else {
            // Year: group by month
            const rawRevenue = await Order.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        sales: { $sum: '$totalAmount' }
                    }
                }
            ]);
            const revenueMap: Record<number, number> = {};
            rawRevenue.forEach(r => { revenueMap[r._id] = r.sales; });

            const monthNames = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
            for (let m = 1; m <= 12; m++) {
                revenueChart.push({ name: monthNames[m - 1], sales: revenueMap[m] || 0 });
            }
        }

        // --- Order status pie chart ---
        const orderStatusAgg = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);
        const statusMap: Record<string, number> = {};
        orderStatusAgg.forEach(s => { statusMap[s._id] = s.count; });

        const orderStatusChart = [
            { name: 'Hoàn thành', value: statusMap['delivered'] || 0 },
            { name: 'Đang giao', value: statusMap['shipping'] || 0 },
            { name: 'Chờ xác nhận', value: (statusMap['pending'] || 0) + (statusMap['confirmed'] || 0) },
            { name: 'Đã huỷ', value: statusMap['cancelled'] || 0 },
        ].filter(s => s.value > 0);

        // --- Top selling products ---
        const topProducts = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    totalQty: { $sum: '$items.qty' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    name: '$product.name',
                    image: { $arrayElemAt: ['$product.images', 0] },
                    totalQty: 1,
                    totalRevenue: 1
                }
            }
        ]);

        // --- Recent orders ---
        const recentOrders = await Order.find()
            .populate('customer', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderCode customer totalAmount orderStatus orderSource paymentStatus createdAt');

        res.json({
            success: true,
            data: {
                kpis: {
                    totalCustomers,
                    totalOrders,
                    totalRevenue,
                    totalProductsSold
                },
                revenueChart,
                orderStatusChart,
                topProducts,
                recentOrders
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};
