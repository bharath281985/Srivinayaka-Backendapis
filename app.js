import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import attributeRoutes from './routes/attributeRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import appManagementRoutes from './routes/appManagementRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import brandValueRoutes from './routes/brandValueRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';

dotenv.config();

connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'https://celadon-marigold-1d587c.netlify.app',
];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/app-management', appManagementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/brand-values', brandValueRoutes);
app.use('/api/cms', cmsRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('B2C Saree E-Commerce API is running...');
});

app.get('/api/health', (req, res) => {
  res
    .status(200)
    .json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

if (process.env.NO_LISTEN !== 'true') {
  app.listen(
    PORT,
    () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      // Start automated background watcher for Google Play & Apple App Store
      import('./services/storeVersionService.js')
        .then(({ startStoreVersionWatcher }) => startStoreVersionWatcher(60))
        .catch((err) => console.warn('[AppUpdate] Watcher start error:', err.message));
    },
  );
}

export default app;
