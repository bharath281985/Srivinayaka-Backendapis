import express from 'express';
import { getAtelierCycle, updateAtelierCycle } from '../controllers/atelierController.js';
import { getAppPromo, updateAppPromo } from '../controllers/appPromoController.js';
import { getInstagramFeed, updateInstagramFeed } from '../controllers/instagramController.js';

const router = express.Router();

router.get('/atelier', getAtelierCycle);
router.post('/atelier', updateAtelierCycle);

router.get('/app-promo', getAppPromo);
router.post('/app-promo', updateAppPromo);

router.get('/instagram', getInstagramFeed);
router.post('/instagram', updateInstagramFeed);

export default router;
