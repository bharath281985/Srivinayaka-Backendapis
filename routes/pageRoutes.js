import express from 'express';
import { getPages, getPageBySlug, updatePage } from '../controllers/pageController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/', getPages);
router.get('/:slug', getPageBySlug);
router.put('/:id', protect, admin, updatePage);
export default router;
