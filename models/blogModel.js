import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    author: { type: String, default: 'Admin' },
    tags: [String],
    isDraft: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Blog', blogSchema);
