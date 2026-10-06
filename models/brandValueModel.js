import mongoose from 'mongoose';

const brandValueSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true }, // lucide icon name
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('BrandValue', brandValueSchema);
