import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';

const router = express.Router();

router.get('/sales', protect, admin, async (req, res) => {
    try {
        const totalSales = await Order.aggregate([{ $match: { isPaid: true } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]);
        const orderCount = await Order.countDocuments();
        const customerCount = await User.countDocuments();
        const productCount = await Product.countDocuments();

        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

        res.json({
            totalRevenue: totalSales[0]?.total || 0,
            totalOrders: orderCount,
            totalCustomers: customerCount,
            totalProducts: productCount,
            recentOrders
        });
    } catch (e) {
        res.status(500).json({ message: 'Error generating report' });
    }
});

export default router;
