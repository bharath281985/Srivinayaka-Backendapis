import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_db';

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: '/' },
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
});

const Banner = mongoose.model('Banner', bannerSchema);

async function deleteSecondBanner() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all banners sorted by position
        const banners = await Banner.find({}).sort({ position: 1 });
        
        if (banners.length < 2) {
            console.log('Fewer than 2 banners found. Nothing to delete.');
            return;
        }

        const secondBanner = banners[1];
        console.log('Found second banner:', secondBanner.title);

        if (secondBanner.title === 'Manifested by Artisans' || secondBanner.linkUrl === '/ABOUT') {
            await Banner.findByIdAndDelete(secondBanner._id);
            console.log('Successfully deleted the second banner.');
        } else {
            console.log('The second banner does not match "Manifested by Artisans". Please double check.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

deleteSecondBanner();
