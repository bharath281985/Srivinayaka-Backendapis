import express from 'express';
const router = express.Router();
import { initiatePayment, paymentCallback } from '../controllers/paymentController.js';
import {
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
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/dashboard-stats').get(protect, admin, getDashboardStats);
router.route('/missed-bookings').get(protect, admin, getMissedBookings);
router.route('/export').get(protect, admin, exportOrders);
router.route('/easebuzz/initiate').post(protect, initiatePayment);
router.route('/easebuzz/callback').post(paymentCallback);
router.route('/myorders').get(protect, getMyOrders);
router.route('/track/:id').get(trackOrderById);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/status').put(protect, admin, updateOrderStatus);
router.route('/:id/invoice.pdf').get(protect, admin, getOrderInvoicePdf);

export default router;
