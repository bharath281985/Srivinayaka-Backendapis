import mongoose from 'mongoose';
import Banner from './models/bannerModel.js';
import dotenv from 'dotenv';
dotenv.config();

const query = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const banners = await Banner.find({});
        const simplified = banners.map(b => ({
            id: b._id,
            title: b.title,
            isActive: b.isActive,
            sideImageUrl: b.sideImageUrl,
            sideImageUrls: b.sideImageUrls
        }));
        console.log(JSON.stringify(simplified, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

query();
