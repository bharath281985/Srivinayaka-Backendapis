import express from 'express';
const router = express.Router();
import { subscribe, getAllSubscribers, deleteSubscriber } from '../controllers/newsletterController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Public route for subscription
router.post('/subscribe', subscribe);

// Admin routes for managing subscribers
router.get('/', protect, admin, getAllSubscribers);
router.delete('/:id', protect, admin, deleteSubscriber);

export default router;
