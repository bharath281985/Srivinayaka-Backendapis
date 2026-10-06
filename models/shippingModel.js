import mongoose from 'mongoose';

const shippingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 },
    estimatedDays: { type: String, default: '3-5 days' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Shipping', shippingSchema);
