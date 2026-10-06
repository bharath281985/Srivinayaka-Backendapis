import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, enum: ['General', 'Shipping', 'Returns', 'Payment', 'Products'], default: 'General' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('FAQ', faqSchema);
