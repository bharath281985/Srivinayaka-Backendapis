import express from 'express';
import { getAttributes, createAttribute, updateAttribute, deleteAttribute } from '../controllers/attributeController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();
router.route('/').get(protect, admin, getAttributes).post(protect, admin, createAttribute);
router.route('/:id').put(protect, admin, updateAttribute).delete(protect, admin, deleteAttribute);
export default router;
