import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import Coupon from '../models/couponModel.js';
import { recordCouponUse } from './couponController.js';
import { sendOrderStatusEmail, sendWelcomeEmail, sendNewOrderNotification, buildInvoicePdfBuffer } from '../utils/emailService.js';
import { decrementInventoryForOrder } from '../utils/orderInventory.js';
import mongoose from 'mongoose';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeOrderStatus = (status) => {
    const map = {
        Pending: 'Order Confirmed',
        Processing: 'Order Packed',
        'In-Production': 'Order Packed',
        'Out for Delhivary': 'Out for Delivery',
        Delhivered: 'Delivered',
    };

    return map[status] || status || 'Order Confirmed';
};

const isPickupOrRapido = (order) => {
    const method = order?.shippingMethod || '';
    return method === 'Store Pickup' || method === 'Delivery By Rapido' || /rapido/i.test(method);
};

const normalizeStatusForOrder = (status, order) => {
    const normalized = normalizeOrderStatus(status);
    if (isPickupOrRapido(order)) {
        const pickupMap = {
            Shipped: 'Ready to Pickup',
            'Out for Delivery': 'Ready to Pickup',
        };

        return pickupMap[normalized] || normalized;
    }

    return normalized;
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
    try {
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            shippingMethod,
            totalPrice,
            couponCode,
            discountAmount,
        } = req.body;

        if (!orderItems || orderItems.length === 0) {
            res.status(400).json({ message: 'No order items' });
            return;
        }

        if (!shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.postalCode || !shippingAddress?.country) {
            res.status(400).json({ message: 'Incomplete shipping address' });
            return;
        }

        const subtotal = Number(itemsPrice) || 0;
        const tax = Number(taxPrice) || 0;
        const shipping = Number(shippingPrice) || 0;
        const discount = Number(discountAmount) || 0;
        const finalTotal = Math.max(0, subtotal + tax + shipping - discount);

        if (couponCode && couponCode.trim()) {
            const code = couponCode.trim().toUpperCase();
            const coupon = await Coupon.findOne({ code, isActive: true });
            if (!coupon) return res.status(400).json({ message: 'Invalid coupon code' });
            const now = new Date();
            const endDate = coupon.endDate || coupon.expiryDate;
            if (coupon.startDate && now < coupon.startDate) return res.status(400).json({ message: 'This coupon is not yet valid' });
            if (endDate && now > endDate) return res.status(400).json({ message: 'Coupon has expired' });
            if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: 'Coupon usage limit reached' });
            if (subtotal < (coupon.minOrderAmount || 0)) return res.status(400).json({ message: `Minimum order amount is Rs. ${coupon.minOrderAmount}` });
            if (coupon.type === 'welcome') {
                const used = coupon.usedBy && coupon.usedBy.some(id => id && id.toString() === req.user._id.toString());
                if (used) return res.status(400).json({ message: 'You have already used this coupon' });
            }
        }

        const order = new Order({
            orderItems: orderItems.map((x) => ({
                ...x,
                product: x.product,
                image: x.image || 'https://images.unsplash.com/photo-1583391733975-29622d14bc75?auto=format&fit=crop&w=100&q=80',
            })),
            user: req.user._id,
            shippingAddress: {
                ...shippingAddress,
                phone: shippingAddress.phone || '',
            },
            paymentMethod,
            itemsPrice: subtotal,
            taxPrice: tax,
            shippingPrice: shipping,
            shippingMethod,
            couponCode: couponCode && couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
            discountAmount: discount,
            totalPrice: finalTotal,
        });

        const createdOrder = await order.save();
        if (couponCode && couponCode.trim()) await recordCouponUse(couponCode.trim().toUpperCase(), req.user._id);

        // Send confirmation emails
        const populatedOrder = await Order.findById(createdOrder._id).populate('user', 'name email');
        // sendNewOrderNotification(populatedOrder);

        res.status(201).json(createdOrder);
    } catch (error) {
        console.error('ADD ORDER ITEMS ERROR:', error);
        res.status(500).json({ message: error.message || 'Server error while creating order' });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
        'user',
        'name email'
    );

    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            // Attempt inventory decrement but don't crash if it fails (Admin Override)
            try {
                await decrementInventoryForOrder(order);
            } catch (inventoryError) {
                console.warn(`Manual Pay Inventory Warning for Order ${order._id}:`, inventoryError.message);
            }

            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = {
                id: req.body.id || 'MANUAL',
                status: req.body.status || 'success',
                update_time: req.body.update_time || new Date().toISOString(),
                email_address: req.body.email_address,
                status_message: req.body.status_message || 'Manually marked as paid by Admin'
            };

            const updatedOrder = await order.save();

            // Populate user before sending email
                await updatedOrder.populate('user', 'name email');
            sendOrderStatusEmail(updatedOrder);

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error('UPDATE ORDER TO PAID ERROR:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Update order status (for admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        const { orderStatus, isDelivered } = req.body;

        if (orderStatus) {
            order.orderStatus = normalizeStatusForOrder(orderStatus, order);
        }

        if (isDelivered || order.orderStatus === 'Delivered') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        } else if (order.orderStatus && order.orderStatus !== 'Delivered') {
            order.isDelivered = false;
            order.deliveredAt = undefined;
        }

        const updatedOrder = await order.save();

        // Populate user before sending email
        await updatedOrder.populate('user', 'name email');
        sendOrderStatusEmail(updatedOrder);

        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 1000)); // Fixed: allowed up to 1000, default 1000
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const { startDate, endDate, isPaid, fulfillment } = req.query;

        const filter = {
            $or: [
                { isPaid: true },
                { paymentMethod: { $ne: 'Online' } }
            ]
        };

        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: end
            };
        } else if (startDate) {
            filter.createdAt = {
                $gte: new Date(startDate)
            };
        } else if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt = {
                $lte: end
            };
        }

        if (isPaid === 'true') filter.isPaid = true;
        if (isPaid === 'false') filter.isPaid = false;

        if (fulfillment === 'pickup') {
            filter.shippingMethod = { $in: ['Store Pickup', 'Delivery By Rapido'] };
        } else if (fulfillment === 'delivery') {
            filter.shippingMethod = { $nin: ['Store Pickup', 'Delivery By Rapido'] };
        }
        
        if (req.query.status && req.query.status !== 'All') {
            const status = req.query.status;
            if (status === 'New Order Recieved') {
                 filter.orderStatus = { $in: ['Pending', 'Order Confirmed', 'New Order Recieved'] };
            } else if (status === 'Order Packed') {
                 filter.orderStatus = { $in: ['Processing', 'In-Production', 'Order Packed'] };
            } else if (status === 'Out for Delivery') {
                 filter.orderStatus = { $in: ['Out for Delhivary', 'Out for Delivery'] };
            } else if (status === 'Delivered') {
                 filter.orderStatus = { $in: ['Delhivered', 'Delivered'] };
            } else {
                 filter.orderStatus = status;
            }
        }

        if (search) {
            const q = new RegExp(escapeRegex(search), 'i');
            const digitSearch = search.replace(/\D/g, '');

            const userConditions = [
                { name: q },
                { email: q },
                { phone: q }
            ];
            if (digitSearch.length >= 3) {
                userConditions.push({ phone: new RegExp(escapeRegex(digitSearch), 'i') });
            }

            const matchingUsers = await User.find({ $or: userConditions }).select('_id');
            const userIds = matchingUsers.map((u) => u._id);

            const searchOr = [
                { orderStatus: q },
                { shippingMethod: q },
                { 'shippingAddress.phone': q },
                { 'shippingAddress.city': q },
                { 'shippingAddress.address': q },
            ];

            if (digitSearch.length >= 3) {
                searchOr.push({ 'shippingAddress.phone': new RegExp(escapeRegex(digitSearch), 'i') });
            }

            if (userIds.length > 0) {
                searchOr.push({ user: { $in: userIds } });
            }

            if (mongoose.isValidObjectId(search)) {
                searchOr.push({ _id: new mongoose.Types.ObjectId(search) });
            } else {
                searchOr.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$_id' },
                            regex: escapeRegex(search),
                            options: 'i',
                        },
                    },
                });
            }

            filter.$and = [{ $or: searchOr }];
        }

        const [orders, total, stats] = await Promise.all([
            Order.find(filter)
                .populate('user', 'id name phone email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter),
            Order.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] } },
                        paidCount: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] } },
                        unpaidCount: { $sum: { $cond: [{ $eq: ["$isPaid", false] }, 1, 0] } },
                        newCount: { $sum: { $cond: [{ $in: ["$orderStatus", ["Order Confirmed", "New Order Recieved"]] }, 1, 0] } },
                        packedCount: { $sum: { $cond: [{ $eq: ["$orderStatus", "Order Packed"] }, 1, 0] } }
                    }
                }
            ])
        ]);

        const globalStats = stats[0] || { totalRevenue: 0, paidCount: 0, unpaidCount: 0, newCount: 0, packedCount: 0 };

        res.json({
            orders,
            page,
            pages: Math.ceil(total / limit),
            total,
            totalRevenue: globalStats.totalRevenue,
            paidCount: globalStats.paidCount,
            unpaidCount: globalStats.unpaidCount,
            newCount: globalStats.newCount,
            packedCount: globalStats.packedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/orders/dashboard-stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        console.log('[getDashboardStats] Fetching aggregation stats...');

        const { startUtc: todayStart } = getIstDayRange();
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

        const [chartData, productCount, userCount, usersThisWeek, usersLastWeek, topProducts, recentOrders] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        $or: [
                            { isPaid: true },
                            { paymentMethod: { $ne: 'Online' } }
                        ]
                    }
                },
                {
                    $facet: {
                        today: [
                            { $match: { createdAt: { $gte: todayStart } } },
                            { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } }
                        ],
                        week: [
                            { $match: { createdAt: { $gte: weekStart } } },
                            { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } }
                        ],
                        total: [
                            { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } }
                        ]
                    }
                }
            ]).catch(err => { console.error('Aggregation Error:', err); return []; }),
            Product.countDocuments({}).catch(err => { console.error('Product Count Error:', err); return 0; }),
            User.countDocuments({}).catch(err => { console.error('User Count Error:', err); return 0; }),
            User.countDocuments({ createdAt: { $gte: weekStart } }).catch(() => 0),
            User.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekStart } }).catch(() => 0),
            Order.aggregate([
                {
                    $match: {
                        $or: [
                            { isPaid: true },
                            { paymentMethod: { $ne: 'Online' } }
                        ]
                    }
                },
                { $unwind: "$orderItems" },
                {
                    $group: {
                        _id: "$orderItems.product",
                        name: { $first: "$orderItems.name" },
                        image: { $first: "$orderItems.image" },
                        totalSold: { $sum: "$orderItems.qty" }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 }
            ]).catch(() => []),
            Order.find({
                $or: [
                    { isPaid: true },
                    { paymentMethod: { $ne: 'Online' } }
                ]
            })
                .populate('user', 'name email phone')
                .sort({ createdAt: -1 })
                .limit(5)
                .catch(err => { console.error('Recent Orders Error:', err); return []; })
        ]);

        const stats = chartData[0] || {};
        const today = stats.today?.[0] || { revenue: 0, orders: 0 };
        const week = stats.week?.[0] || { revenue: 0, orders: 0 };
        const total = stats.total?.[0] || { revenue: 0, orders: 0 };

        res.json({
            totalVolume: total.revenue || 0,
            totalOrders: total.orders || 0,
            totalProducts: productCount || 0,
            totalCustomers: userCount || 0,
            newCustomersThisWeek: usersThisWeek,
            customerGrowth: usersLastWeek > 0 ? ((usersThisWeek - usersLastWeek) / usersLastWeek) * 100 : 0,
            topProducts,
            recentOrders,
            charts: [
                { label: 'Today', orders: today.orders, revenue: today.revenue },
                { label: 'This Week', orders: week.orders, revenue: week.revenue },
                { label: 'Overall', orders: total.orders, revenue: total.revenue }
            ]
        });
    } catch (error) {
        console.error('CRITICAL DASHBOARD STATS ERROR:', error);
        res.status(500).json({
            message: 'Failed to load dashboard statistics',
            error: error.message
        });
    }
};


const getIstDayRange = (date = new Date()) => {
    const offsetMinutes = 330;
    const offsetMs = offsetMinutes * 60 * 1000;
    const istNow = new Date(date.getTime() + offsetMs);
    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const day = istNow.getUTCDate();

    const startUtc = new Date(Date.UTC(year, month, day, 0, 0, 0) - offsetMs);
    const endUtc = new Date(Date.UTC(year, month, day + 1, 0, 0, 0) - offsetMs);

    return { startUtc, endUtc };
};

// @desc    Get missed bookings / unpaid orders
// @route   GET /api/orders/missed-bookings
// @access  Private/Admin
const getMissedBookings = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 8));
        const search = (req.query.search || '').trim();
        const skip = (page - 1) * limit;

        const unpaidFilter = { isPaid: false };
        const { startUtc, endUtc } = getIstDayRange();

        const [summary, todaysSummary] = await Promise.all([
            Order.countDocuments(unpaidFilter),
            Order.countDocuments({
                ...unpaidFilter,
                createdAt: { $gte: startUtc, $lt: endUtc },
            }),
        ]);

        const pipeline = [
            { $match: unpaidFilter },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    idStr: { $toString: '$_id' },
                },
            },
        ];

        if (search) {
            const q = new RegExp(escapeRegex(search), 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { idStr: q },
                        { 'user.name': q },
                        { 'user.email': q },
                        { 'user.phone': q },
                        { 'shippingAddress.phone': q },
                        { 'shippingAddress.city': q },
                        { orderStatus: q },
                    ],
                },
            });
        }

        pipeline.push({
            $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                ],
                meta: [
                    { $count: 'total' },
                ],
            },
        });

        const [result] = await Order.aggregate(pipeline);
        const orders = result?.data || [];
        const total = result?.meta?.[0]?.total || 0;
        const pages = Math.max(1, Math.ceil(total / limit));

        res.json({
            orders,
            page,
            pages,
            limit,
            total,
            totalUnpaid: summary,
            todayUnpaid: todaysSummary,
        });
    } catch (error) {
        console.error('MISSed BOOKINGS ERROR:', error);
        res.status(500).json({ message: 'Failed to load missed bookings' });
    }
};

// @desc    Track order by ID (public)
// @route   GET /api/orders/track/:id
// @access  Public
const trackOrderById = async (req, res) => {
    const order = await Order.findById(req.params.id).select(
        '_id createdAt totalPrice orderStatus isPaid isDelivered deliveredAt shippingAddress.city shippingMethod'
    );

    if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
    }

    res.json(order);
};

// @desc    Export orders for admin
// @route   GET /api/orders/export
// @access  Private/Admin
const exportOrders = async (req, res) => {
    try {
        const { startDate, endDate, fulfillment } = req.query;
        let query = {};

        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: end
            };
        } else if (startDate) {
            query.createdAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $lte: end };
        }

        // Only export paid orders or non-online orders
        query = {
            ...query,
            $or: [
                { isPaid: true },
                { paymentMethod: { $ne: 'Online' } }
            ]
        };

        if (fulfillment === 'pickup') {
            query.shippingMethod = { $in: ['Store Pickup', 'Delivery By Rapido'] };
        } else if (fulfillment === 'delivery') {
            query.shippingMethod = { $nin: ['Store Pickup', 'Delivery By Rapido'] };
        }

        const orders = await Order.find(query)
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error exporting orders' });
    }
};

// @desc    Get PDF invoice for order (admin)
// @route   GET /api/orders/:id/invoice.pdf
// @access  Private/Admin
const getOrderInvoicePdf = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email').lean();
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        const buffer = await buildInvoicePdfBuffer(order);
        const filename = `invoice-${order._id.toString().slice(-8).toUpperCase()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Invoice PDF generation failed', error);
        res.status(500).json({ message: 'Failed to generate invoice PDF' });
    }
};

export {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    updateOrderStatus,
    getMyOrders,
    getOrders,
    getDashboardStats,
    getMissedBookings,
    trackOrderById,
    exportOrders,
    getOrderInvoicePdf,
};
