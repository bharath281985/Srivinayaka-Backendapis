import express from 'express';
import { getBrandValues, createBrandValue, updateBrandValue, deleteBrandValue } from '../controllers/brandValueController.js';

const router = express.Router();

router.get('/', getBrandValues);
router.post('/', createBrandValue);
router.put('/:id', updateBrandValue);
router.delete('/:id', deleteBrandValue);

export default router;
