import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_db';

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
});

const Banner = mongoose.model('Banner', bannerSchema);

async function listBanners() {
    try {
        await mongoose.connect(MONGODB_URI);
        const banners = await Banner.find({}).sort({ position: 1 });
        console.log('Current Banners in DB:');
        banners.forEach((b, i) => {
            console.log(`${i + 1}. ${b.title} (Position: ${b.position})`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listBanners();
