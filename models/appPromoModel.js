import mongoose from 'mongoose';

const appPromoSchema = new mongoose.Schema({
    badge: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    mockupImage: { type: String, required: true },
    mockupImages: [String],
    backgroundImage: { type: String },
    appleStoreLink: { type: String, default: '#' },
    playStoreLink: { type: String, default: '#' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('AppPromo', appPromoSchema);
