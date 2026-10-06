import mongoose from 'mongoose';

const atelierCycleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    steps: [{
        num: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true }
    }],
    image1: { type: String, required: true },
    image2: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('AtelierCycle', atelierCycleSchema);
