import express from 'express';
const router = express.Router();
import {
    getProducts,
    getProductById,
    createProduct,
    deleteProduct,
    updateProduct,
    createProductReview,
    deleteProductReview,
    backfillProductSlugs,
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/').get(getProducts).post(protect, admin, createProduct);
router.route('/backfill-slugs').post(protect, admin, backfillProductSlugs);
router.route('/:id/reviews').post(protect, createProductReview);
router.route('/:id/reviews/:reviewId').delete(protect, admin, deleteProductReview);
router.route('/:id')
    .get(getProductById)
    .delete(protect, admin, deleteProduct)
    .put(protect, admin, updateProduct);

export default router;

