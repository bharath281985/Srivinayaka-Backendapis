
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_db';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');
        const sample = await Order.find().limit(10);
        console.log(JSON.stringify(sample, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
