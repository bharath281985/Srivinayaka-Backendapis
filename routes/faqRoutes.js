import express from 'express';
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../controllers/faqController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();
router.route('/').get(getFAQs).post(protect, admin, createFAQ);
router.route('/:id').put(protect, admin, updateFAQ).delete(protect, admin, deleteFAQ);
export default router;
