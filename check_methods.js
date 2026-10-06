
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_db';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Order = mongoose.model('Order', new mongoose.Schema({ paymentMethod: String }, { strict: false }), 'orders');
        const methods = await Order.distinct('paymentMethod');
        console.log('Distinct Payment Methods:', methods);
        
        for (const method of methods) {
            const count = await Order.countDocuments({ paymentMethod: method });
            const unpaid = await Order.countDocuments({ paymentMethod: method, isPaid: false });
            console.log(`${method}: Total ${count}, Unpaid ${unpaid}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
