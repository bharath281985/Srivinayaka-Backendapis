import mongoose from 'mongoose';

const instagramSchema = new mongoose.Schema({
    badge: { type: String, required: true },
    handle: { type: String, required: true },
    posts: [{
        image: { type: String, default: '' },
        link: { type: String, default: '#' }
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('InstagramFeed', instagramSchema);
