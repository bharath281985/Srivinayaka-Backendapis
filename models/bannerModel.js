import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    imageUrl: { type: String, required: true }, // Main Background
    sideImageUrl: { type: String }, // Small Floating Image
    sideImageUrls: [String], // Multiple Floating Images
    linkUrl: { type: String, default: '/' }, // Primary Link
    primaryBtnText: { type: String, default: 'Explore Atelier' },
    secondaryBtnText: { type: String, default: 'Our Philosophy' },
    secondaryBtnLink: { type: String, default: '/about' },
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Banner', bannerSchema);
