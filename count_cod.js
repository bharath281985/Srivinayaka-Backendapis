
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_db';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Define a minimal schema for the query
        const OrderSchema = new mongoose.Schema({
            paymentMethod: String,
            isPaid: Boolean,
            createdAt: Date
        }, { collection: 'orders' });

        const Order = mongoose.model('Order', OrderSchema);

        const results = await Order.aggregate([
            {
                $match: {
                    isPaid: false,
                    paymentMethod: { $ne: 'Online' }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('---START_RESULTS---');
        results.forEach(res => {
            console.log(`${res._id}: ${res.count}`);
        });
        console.log('---END_RESULTS---');

        const total = results.reduce((acc, curr) => acc + curr.count, 0);
        console.log(`Total Unpaid COD Orders: ${total}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
