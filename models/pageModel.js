import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true }, // about-us, shipping-policy, etc.
    title: { type: String, required: true },
    content: { type: String, default: '' },
    metadata: { type: Object, default: {} },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Page', pageSchema);
