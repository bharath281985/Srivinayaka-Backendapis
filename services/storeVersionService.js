import https from 'https';
import Setting from '../models/settingModel.js';
import User from '../models/userModel.js';

const ANDROID_PACKAGE = 'com.srivinayakacollections.android';
const IOS_BUNDLE_ID = 'com.srivinayakacollections.ios';
const DEFAULT_ANDROID_STORE = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const DEFAULT_IOS_STORE = 'https://apps.apple.com/app/id0000000000';

let lastCheckTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Compare two semver strings: returns true if candidate > current
 */
export function isNewerVersion(current, candidate) {
  if (!current || !candidate) return false;
  const parse = (v) => String(v).replace(/[^0-9.]/g, '').split('.').map(Number);
  const [cMaj = 0, cMin = 0, cPatch = 0] = parse(current);
  const [kMaj = 0, kMin = 0, kPatch = 0] = parse(candidate);

  if (kMaj !== cMaj) return kMaj > cMaj;
  if (kMin !== cMin) return kMin > cMin;
  return kPatch > cPatch;
}

/**
 * Fetch HTML/JSON via HTTPS
 */
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Store fetch timeout'));
    });
  });
}

/**
 * Automatically fetch live published version from Google Play Store
 */
export async function fetchPlayStoreVersion(packageName = ANDROID_PACKAGE) {
  try {
    const url = `https://play.google.com/store/apps/details?id=${packageName}&hl=en`;
    const { status, data } = await fetchUrl(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (status !== 200 || !data) {
      console.warn(`[StoreVersionService] Google Play returned status ${status} for ${packageName}`);
      return null;
    }

    // Match Google Play's internal data: [[["1.0.13"]],[[[...
    const match = data.match(/\[\[\["(\d+\.\d+(?:\.\d+)*)"\]\],\[\[\[\d+/);
    if (match && match[1]) {
      return {
        version: match[1],
        storeUrl: `https://play.google.com/store/apps/details?id=${packageName}`,
      };
    }

    // Fallback pattern
    const fallbackMatch = data.match(/\]\]\],"(\d+\.\d+(?:\.\d+)*)",/);
    if (fallbackMatch && fallbackMatch[1]) {
      return {
        version: fallbackMatch[1],
        storeUrl: `https://play.google.com/store/apps/details?id=${packageName}`,
      };
    }

    return null;
  } catch (err) {
    console.warn('[StoreVersionService] Google Play fetch error:', err.message);
    return null;
  }
}

/**
 * Automatically fetch live published version from Apple App Store (official iTunes API)
 */
export async function fetchAppStoreVersion(bundleId = IOS_BUNDLE_ID) {
  try {
    const url = `https://itunes.apple.com/lookup?bundleId=${bundleId}&country=in`;
    const { status, data } = await fetchUrl(url);

    if (status !== 200 || !data) return null;

    const parsed = JSON.parse(data);
    if (parsed.resultCount > 0 && parsed.results[0]) {
      const res = parsed.results[0];
      return {
        version: res.version,
        storeUrl: res.trackViewUrl || DEFAULT_IOS_STORE,
        releaseNotes: res.releaseNotes,
      };
    }

    return null;
  } catch (err) {
    console.warn('[StoreVersionService] App Store fetch error:', err.message);
    return null;
  }
}

/**
 * Send push notification to all users when a new version is detected
 */
export async function broadcastUpdateNotification({ version, platform, updateMessage }) {
  try {
    const users = await User.find({ pushToken: { $exists: true, $ne: null, $ne: '' } })
      .select('pushToken')
      .lean();
    const tokens = [...new Set(users.map(u => u.pushToken).filter(Boolean))];

    if (tokens.length === 0) {
      console.log('[StoreVersionService] No registered push tokens found to notify.');
      return;
    }

    console.log(`[StoreVersionService] Sending update push notification to ${tokens.length} devices...`);

    const title = '🚀 New Update Available!';
    const body =
      updateMessage ||
      `Version ${version} of Sri Vinayaka Collections is now available on the ${
        platform === 'ios' ? 'App Store' : 'Play Store'
      }. Update now for the latest features!`;

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { type: 'APP_UPDATE', version, platform },
    }));

    // Chunk by 100
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
    }

    console.log(`[StoreVersionService] Successfully notified ${tokens.length} devices.`);
  } catch (err) {
    console.error('[StoreVersionService] Failed to broadcast update notification:', err.message);
  }
}

/**
 * Sync store versions without any admin involvement.
 * Compares live store versions with saved DB versions.
 * If a new version is live on store:
 * 1. Updates DB
 * 2. Broadcasts Push Notification
 */
export async function syncStoreVersions({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastCheckTime < CACHE_TTL_MS) {
    return { skipped: true, reason: 'Cache still valid' };
  }
  lastCheckTime = now;

  console.log('[StoreVersionService] Auto-checking Google Play and Apple App Store for updates...');

  const [playStore, appStore] = await Promise.all([
    fetchPlayStoreVersion(ANDROID_PACKAGE),
    fetchAppStoreVersion(IOS_BUNDLE_ID),
  ]);

  const settingDoc = await Setting.findOne({ key: 'mobile_app_settings' });
  const currentSettings = settingDoc?.value || {};

  let hasChanges = false;
  const updatedValue = { ...currentSettings };

  // Check Android
  if (playStore?.version) {
    console.log(`[StoreVersionService] Google Play live version: ${playStore.version} (DB current: ${currentSettings.latestAndroidVersion})`);
    if (isNewerVersion(currentSettings.latestAndroidVersion, playStore.version)) {
      console.log(`[StoreVersionService] 🎉 New Android version detected on Play Store: ${playStore.version}!`);
      updatedValue.latestAndroidVersion = playStore.version;
      updatedValue.androidStoreUrl = playStore.storeUrl || DEFAULT_ANDROID_STORE;
      hasChanges = true;

      // Broadcast notification
      await broadcastUpdateNotification({
        version: playStore.version,
        platform: 'android',
        updateMessage: updatedValue.updateMessage,
      });
    } else if (!currentSettings.latestAndroidVersion) {
      // First time initialization
      updatedValue.latestAndroidVersion = playStore.version;
      updatedValue.androidStoreUrl = playStore.storeUrl || DEFAULT_ANDROID_STORE;
      hasChanges = true;
    }
  }

  // Check iOS
  if (appStore?.version) {
    console.log(`[StoreVersionService] Apple App Store live version: ${appStore.version} (DB current: ${currentSettings.latestIosVersion})`);
    if (isNewerVersion(currentSettings.latestIosVersion, appStore.version)) {
      console.log(`[StoreVersionService] 🎉 New iOS version detected on App Store: ${appStore.version}!`);
      updatedValue.latestIosVersion = appStore.version;
      updatedValue.iosStoreUrl = appStore.storeUrl || DEFAULT_IOS_STORE;
      hasChanges = true;

      // Broadcast notification
      await broadcastUpdateNotification({
        version: appStore.version,
        platform: 'ios',
        updateMessage: updatedValue.updateMessage,
      });
    } else if (!currentSettings.latestIosVersion) {
      updatedValue.latestIosVersion = appStore.version;
      updatedValue.iosStoreUrl = appStore.storeUrl || DEFAULT_IOS_STORE;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await Setting.findOneAndUpdate(
      { key: 'mobile_app_settings' },
      { key: 'mobile_app_settings', value: updatedValue, description: 'Mobile app controls' },
      { new: true, upsert: true }
    );
    console.log('[StoreVersionService] Mobile app settings updated with live store versions.');
  }

  return {
    androidStoreVersion: playStore?.version || currentSettings.latestAndroidVersion,
    iosStoreVersion: appStore?.version || currentSettings.latestIosVersion,
    updated: hasChanges,
  };
}

/**
 * Start recurring background watcher (runs every 45 minutes)
 */
export function startStoreVersionWatcher(intervalMinutes = 45) {
  // First run 15 seconds after server start
  setTimeout(() => {
    syncStoreVersions().catch((err) => {
      console.warn('[StoreVersionService] Initial background sync error:', err.message);
    });
  }, 15000);

  // Periodic interval
  setInterval(() => {
    syncStoreVersions().catch((err) => {
      console.warn('[StoreVersionService] Periodic background sync error:', err.message);
    });
  }, intervalMinutes * 60 * 1000);

  console.log(`[StoreVersionService] Automated Store Watcher started (checks every ${intervalMinutes} mins).`);
}
