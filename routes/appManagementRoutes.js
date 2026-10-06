import express from 'express';
import {
  getHomeSections,
  createHomeSection,
  updateHomeSection,
  deleteHomeSection,
  getMobileBanners,
  createMobileBanner,
  updateMobileBanner,
  deleteMobileBanner,
  getFeaturedProducts,
  updateFeaturedProductFlags,
  getCategoryVisibility,
  updateCategoryVisibility,
  getPushNotifications,
  createPushNotification,
  updatePushNotification,
  deletePushNotification,
  getMobileAppSettings,
  updateMobileAppSettings,
  getMobileHomeData,
  syncStoreVersionsEndpoint,
} from '../controllers/appManagementController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auto-sync or force-sync with live stores (Google Play & Apple App Store)
router.post('/sync-store-versions', syncStoreVersionsEndpoint);

router.get('/mobile-home', getMobileHomeData);

router.route('/home-sections').get(protect, admin, getHomeSections).post(protect, admin, createHomeSection);
router.route('/home-sections/:id').put(protect, admin, updateHomeSection).delete(protect, admin, deleteHomeSection);

router.route('/mobile-banners').get(protect, admin, getMobileBanners).post(protect, admin, createMobileBanner);
router.route('/mobile-banners/:id').put(protect, admin, updateMobileBanner).delete(protect, admin, deleteMobileBanner);

router.route('/featured-products').get(protect, admin, getFeaturedProducts);
router.route('/featured-products/:id').put(protect, admin, updateFeaturedProductFlags);

router.route('/category-visibility').get(protect, admin, getCategoryVisibility);
router.route('/category-visibility/:id').put(protect, admin, updateCategoryVisibility);

router.route('/push-notifications').get(protect, admin, getPushNotifications).post(protect, admin, createPushNotification);
router.route('/push-notifications/:id').put(protect, admin, updatePushNotification).delete(protect, admin, deletePushNotification);

// Public read: mobile notification inbox (Sent notifications, last 30)
router.get('/notifications-inbox', async (req, res) => {
  const { default: PushNotification } = await import('../models/pushNotificationModel.js');
  const items = await PushNotification.find({ status: 'Sent' })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  res.json(items);
});

// Public read for mobile app boot/config; admin-only write.
router.route('/mobile-settings').get(getMobileAppSettings).put(protect, admin, updateMobileAppSettings);

export default router;

