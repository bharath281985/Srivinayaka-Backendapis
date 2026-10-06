import express from 'express';
import { getCoupons, getPublicCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/couponController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();
router.route('/').get(protect, admin, getCoupons).post(protect, admin, createCoupon);
router.get('/public', getPublicCoupons);
router.route('/:id').put(protect, admin, updateCoupon).delete(protect, admin, deleteCoupon);
router.post('/validate', validateCoupon); // public - used at checkout
export default router;
