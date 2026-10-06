import express from 'express';
import { getShipping, createShipping, updateShipping, deleteShipping } from '../controllers/shippingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();
router.route('/').get(getShipping).post(protect, admin, createShipping);
router.route('/:id').put(protect, admin, updateShipping).delete(protect, admin, deleteShipping);
export default router;
