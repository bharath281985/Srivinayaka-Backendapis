import mongoose from 'mongoose';
import Banner from './models/bannerModel.js';
import dotenv from 'dotenv';
dotenv.config();

const query = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const banners = await Banner.find({});
        console.log(JSON.stringify(banners, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

query();
