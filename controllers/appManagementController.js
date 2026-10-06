import HomeSection from '../models/homeSectionModel.js';
import MobileBanner from '../models/mobileBannerModel.js';
import PushNotification from '../models/pushNotificationModel.js';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import Coupon from '../models/couponModel.js';
import Setting from '../models/settingModel.js';
import BrandValue from '../models/brandValueModel.js';
import AtelierCycle from '../models/atelierCycleModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const inDateWindow = (item, now) => {
  const afterStart = !item.startDate || new Date(item.startDate) <= now;
  const beforeEnd = !item.endDate || new Date(item.endDate) >= now;
  return afterStart && beforeEnd;
};

const getHomeSections = async (req, res) => {
  const sections = await HomeSection.find({}).sort({ displayOrder: 1, createdAt: -1 });
  res.json(sections);
};

const createHomeSection = async (req, res) => {
  const section = await HomeSection.create(req.body);
  res.status(201).json(section);
};

const updateHomeSection = async (req, res) => {
  const section = await HomeSection.findById(req.params.id);
  if (!section) return res.status(404).json({ message: 'Home section not found' });
  Object.assign(section, req.body);
  res.json(await section.save());
};

const deleteHomeSection = async (req, res) => {
  const section = await HomeSection.findById(req.params.id);
  if (!section) return res.status(404).json({ message: 'Home section not found' });
  await section.deleteOne();
  res.json({ message: 'Home section removed' });
};

const getMobileBanners = async (req, res) => {
  const banners = await MobileBanner.find({}).sort({ displayOrder: 1, createdAt: -1 });
  res.json(banners);
};

const createMobileBanner = async (req, res) => {
  const banner = await MobileBanner.create(req.body);
  res.status(201).json(banner);
};

const updateMobileBanner = async (req, res) => {
  const banner = await MobileBanner.findById(req.params.id);
  if (!banner) return res.status(404).json({ message: 'Mobile banner not found' });
  Object.assign(banner, req.body);
  res.json(await banner.save());
};

const deleteMobileBanner = async (req, res) => {
  const banner = await MobileBanner.findById(req.params.id);
  if (!banner) return res.status(404).json({ message: 'Mobile banner not found' });
  await banner.deleteOne();
  res.json({ message: 'Mobile banner removed' });
};

const getFeaturedProducts = async (req, res) => {
  const products = await Product.find(
    {},
    'name sku images basePrice isFeatured isTrending isBestSeller isNewArrival countInStock'
  ).sort({ createdAt: -1 });
  res.json(
    products.map((p) => ({
      ...p.toObject(),
      images: (p.images || []).map((i) => toPublicUrl(i, req)),
    })),
  );
};

const updateFeaturedProductFlags = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const { isFeatured, isTrending, isBestSeller, isNewArrival } = req.body;
  if (isFeatured !== undefined) product.isFeatured = isFeatured;
  if (isTrending !== undefined) product.isTrending = isTrending;
  if (isBestSeller !== undefined) product.isBestSeller = isBestSeller;
  if (isNewArrival !== undefined) product.isNewArrival = isNewArrival;

  res.json(await product.save());
};

const getCategoryVisibility = async (req, res) => {
  const categories = await Category.find({ level: 1 }, 'name slug showInMobile mobileDisplayOrder mobileBannerImage level').sort({ mobileDisplayOrder: 1, name: 1 });
  res.json(
    categories.map((c) => ({
      ...c.toObject(),
      mobileBannerImage: toPublicUrl(c.mobileBannerImage, req),
    })),
  );
};

const updateCategoryVisibility = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found' });

  const { showInMobile, mobileDisplayOrder, mobileBannerImage } = req.body;
  if (showInMobile !== undefined) category.showInMobile = showInMobile;
  if (mobileDisplayOrder !== undefined) category.mobileDisplayOrder = mobileDisplayOrder;
  if (mobileBannerImage !== undefined) category.mobileBannerImage = mobileBannerImage;

  res.json(await category.save());
};

const getPushNotifications = async (req, res) => {
  const notifications = await PushNotification.find({}).sort({ createdAt: -1 });
  res.json(notifications);
};

const createPushNotification = async (req, res) => {
  const payload = {
    ...req.body,
    status: 'Sending',
  };
  
  const notification = await PushNotification.create(payload);
  
  // Actually send notifications using Expo SDK
  try {
    const { Expo } = await import('expo-server-sdk');
    const { default: User } = await import('../models/userModel.js');
    let expo = new Expo();

    const users = await User.find({ pushToken: { $exists: true, $ne: '' } });
    
    let messages = [];
    for (let user of users) {
      if (!Expo.isExpoPushToken(user.pushToken)) {
        continue;
      }
      messages.push({
        to: user.pushToken,
        sound: 'default',
        title: req.body.title,
        body: req.body.message,
        data: { },
      });
    }

    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push chunk:', error);
      }
    }
    
    notification.status = 'Sent';
    await notification.save();
    
  } catch (err) {
    console.error('Failure in push notifications:', err);
    notification.status = 'Failed';
    await notification.save();
  }

  res.status(201).json(notification);
};

const updatePushNotification = async (req, res) => {
  const notification = await PushNotification.findById(req.params.id);
  if (!notification) return res.status(404).json({ message: 'Push notification not found' });
  Object.assign(notification, req.body);
  res.json(await notification.save());
};

const deletePushNotification = async (req, res) => {
  const notification = await PushNotification.findById(req.params.id);
  if (!notification) return res.status(404).json({ message: 'Push notification not found' });
  await notification.deleteOne();
  res.json({ message: 'Push notification removed' });
};

const getMobileAppSettings = async (req, res) => {
  const setting = await Setting.findOne({ key: 'mobile_app_settings' });
  const value = setting?.value || {
      deliveryCharges: 0,
      freeDeliveryMinimumAmount: 0,
      returnPolicy: '',
      supportEmail: '',
      supportPhone: '',
      whatsappSupport: '',
      maintenanceMode: false,
      appVersionControl: '1.0.0',
      // App update checker fields
      latestAndroidVersion: '1.0.14',
      latestIosVersion: '1.0.14',
      androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.srivinayakacollections.android',
      iosStoreUrl: 'https://apps.apple.com/app/id0000000000',
      forceUpdate: false,
      updateMessage: 'A new version of the app is available. Please update to enjoy the latest features and improvements.',
      appLogo: '/uploads/logo_luxe.png',
      featuredLabel: 'THE PRIVATE COLLECTION',
      trendingLabel: 'TRENDING ATELIER',
      newArrivalsLabel: 'DEBUT PIECES',
      bestSellerLabel: 'CELEBRATION DEALS',
      fabricLabel: 'SHOP BY FABRIC',
      occasionLabel: 'OCCASION CURATION',
    };

  // Background non-blocking sync of live store versions
  import('../services/storeVersionService.js')
    .then(({ syncStoreVersions }) => syncStoreVersions({ force: false }))
    .catch((err) => console.warn('[AppUpdate] Background store check error:', err.message));

  res.json({
    ...value,
    appLogo: toPublicUrl(value.appLogo, req),
  });
};

const syncStoreVersionsEndpoint = async (req, res) => {
  try {
    const { syncStoreVersions } = await import('../services/storeVersionService.js');
    const result = await syncStoreVersions({ force: true });
    res.json({ success: true, result });
  } catch (err) {
    console.error('[AppUpdate] syncStoreVersions error:', err);
    res.status(500).json({ message: 'Failed to sync store versions', error: err.message });
  }
};

const updateMobileAppSettings = async (req, res) => {
  try {
    const value = req.body || {};

    // Fetch current settings to detect version change
    const existing = await Setting.findOne({ key: 'mobile_app_settings' });
    const prevAndroid = existing?.value?.latestAndroidVersion;
    const prevIos = existing?.value?.latestIosVersion;
    const newAndroid = value.latestAndroidVersion;
    const newIos = value.latestIosVersion;
    const versionChanged = (newAndroid && newAndroid !== prevAndroid) || (newIos && newIos !== prevIos);

    const setting = await Setting.findOneAndUpdate(
      { key: 'mobile_app_settings' },
      { key: 'mobile_app_settings', value, description: 'Mobile app controls' },
      { new: true, upsert: true }
    );

    // Auto-send push notification to all users if version changed
    if (versionChanged) {
      console.log(`[AppUpdate] Version changed (Android: ${prevAndroid} → ${newAndroid}, iOS: ${prevIos} → ${newIos}). Sending push notifications...`);
      try {
        const User = (await import('../models/userModel.js')).default;
        const users = await User.find({ pushToken: { $exists: true, $ne: null, $ne: '' } }).select('pushToken').lean();
        const tokens = [...new Set(users.map(u => u.pushToken).filter(Boolean))];

        if (tokens.length > 0) {
          const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title: '🚀 New Update Available!',
            body: value.updateMessage || `Version ${newAndroid || newIos} is now available. Update now for the latest features!`,
            data: { type: 'APP_UPDATE', androidVersion: newAndroid, iosVersion: newIos },
          }));

          // Send in chunks of 100 (Expo limit)
          for (let i = 0; i < messages.length; i += 100) {
            const chunk = messages.slice(i, i + 100);
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(chunk),
            });
          }
          console.log(`[AppUpdate] Push notifications sent to ${tokens.length} devices.`);
        }
      } catch (notifyErr) {
        console.error('[AppUpdate] Push notification send failed:', notifyErr.message);
      }
    }

    res.json(setting.value);
  } catch (err) {
    console.error('[AppUpdate] updateMobileAppSettings error:', err);
    res.status(500).json({ message: 'Failed to update mobile settings' });
  }
};

const getMobileHomeData = async (req, res) => {
  const now = new Date();

  const [
    homeSections,
    mobileBanners,
    visibleCategories,
    featuredInitial,
    trendingInitial,
    bestSellerInitial,
    newArrivalsInitial,
    recommended,
    activeCoupons,
    appSettings,
    brandValues,
    atelier,
  ] = await Promise.all([
    HomeSection.find({ status: true }).sort({ displayOrder: 1 }),
    MobileBanner.find({ activeStatus: true }).sort({ displayOrder: 1 }),
    Category.find({ level: 1, showInMobile: true }).sort({ mobileDisplayOrder: 1 }),
    Product.find({ isFeatured: true }).sort({ updatedAt: -1 }).limit(12),
    Product.find({ isTrending: true }).sort({ updatedAt: -1 }).limit(12),
    Product.find({ isBestSeller: true }).sort({ updatedAt: -1 }).limit(12),
    Product.find({ isNewArrival: true }).sort({ createdAt: -1 }).limit(12),
    Product.find({}).sort({ rating: -1, numReviews: -1, createdAt: -1 }).limit(12),
    Coupon.find({ isActive: true }).sort({ createdAt: -1 }).limit(10),
    Setting.findOne({ key: 'mobile_app_settings' }),
    BrandValue.find({ isActive: true }).sort({ position: 1 }),
    AtelierCycle.findOne({ isActive: true }),
  ]);

  // Fallbacks: If no flagged items, show latest products to avoid empty sections in production prep
  const fallbackProducts = await Product.find({}).sort({ createdAt: -1 }).limit(12);
  const featured = featuredInitial.length > 0 ? featuredInitial : fallbackProducts;
  const trending = trendingInitial.length > 0 ? trendingInitial : fallbackProducts;
  const bestSeller = bestSellerInitial.length > 0 ? bestSellerInitial : fallbackProducts;
  const newArrivals = newArrivalsInitial.length > 0 ? newArrivalsInitial : fallbackProducts;

  // Category fallback
  let categories = visibleCategories;
  if (categories.length === 0) {
    categories = await Category.find({ level: 1 }).limit(10);
  }


  const validBanners = mobileBanners.filter((b) => inDateWindow(b, now));
  const validCoupons = activeCoupons.filter((c) => !c.expiryDate || new Date(c.expiryDate) >= now);

  res.json({
    sections: homeSections.map((s) => ({ ...s.toObject(), image: toPublicUrl(s.image, req) })),
    banners: validBanners.map((b) => ({ ...b.toObject(), bannerImage: toPublicUrl(b.bannerImage, req) })),
    categories: categories.map((c) => ({
      ...c.toObject(),
      image: toPublicUrl(c.image, req),
      mobileBannerImage: toPublicUrl(c.mobileBannerImage, req),
    })),
    featured: featured.map((p) => ({ ...p.toObject(), images: (p.images || []).map((i) => toPublicUrl(i, req)) })),
    trending: trending.map((p) => ({ ...p.toObject(), images: (p.images || []).map((i) => toPublicUrl(i, req)) })),
    bestSeller: bestSeller.map((p) => ({ ...p.toObject(), images: (p.images || []).map((i) => toPublicUrl(i, req)) })),
    newArrivals: newArrivals.map((p) => ({ ...p.toObject(), images: (p.images || []).map((i) => toPublicUrl(i, req)) })),
    recommended: recommended.map((p) => ({ ...p.toObject(), images: (p.images || []).map((i) => toPublicUrl(i, req)) })),
    offers: validCoupons,
    brandValues,
    atelier: atelier
      ? {
        ...atelier.toObject(),
        image1: toPublicUrl(atelier.image1, req),
        image2: toPublicUrl(atelier.image2, req),
      }
      : atelier,
    settings: {
      featuredLabel: 'THE PRIVATE COLLECTION',
      trendingLabel: 'TRENDING ATELIER',
      newArrivalsLabel: 'DEBUT PIECES',
      bestSellerLabel: 'CELEBRATION DEALS',
      fabricLabel: 'SHOP BY FABRIC',
      occasionLabel: 'OCCASION CURATION',
      ...(appSettings?.value || {}),
      appLogo: toPublicUrl(appSettings?.value?.appLogo || '/uploads/logo_luxe.png', req),
    },
  });
};

export {
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
};
