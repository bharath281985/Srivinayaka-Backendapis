import express from 'express';
const router = express.Router();
import { getSettings, updateSetting, getSettingByKey } from '../controllers/settingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/').get(protect, admin, getSettings);
router.route('/:key').put(protect, admin, updateSetting).get(getSettingByKey);

export default router;
