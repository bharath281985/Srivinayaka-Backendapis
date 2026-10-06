import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let firebaseApp = null;

try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        firebaseApp = admin.initializeApp();
    }
} catch (e) {
    console.warn('[Firebase Admin] Not configured:', e.message);
}

export const getAuth = () => firebaseApp ? admin.auth() : null;
export const isFirebaseConfigured = () => !!firebaseApp;
