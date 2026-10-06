
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_db';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');
        
        const paidCount = await Order.countDocuments({ isPaid: true });
        const codCount = await Order.countDocuments({ paymentMethod: { $ne: 'Online' } });
        const dashboardCount = await Order.countDocuments({
            $or: [
                { isPaid: true },
                { paymentMethod: { $ne: 'Online' } }
            ]
        });
        
        const totalPaidVolume = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);

        const totalDashboardVolume = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { isPaid: true },
                        { paymentMethod: { $ne: 'Online' } }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);

        console.log('Paid Count:', paidCount);
        console.log('COD Count:', codCount);
        console.log('Dashboard Match Count:', dashboardCount);
        console.log('Total Paid Volume:', totalPaidVolume[0]?.total);
        console.log('Total Dashboard Volume:', totalDashboardVolume[0]?.total);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
