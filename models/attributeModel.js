import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g. Colour, Size, Fabric
    values: [{ type: String }], // e.g. ['Red', 'Blue', 'Green']
}, { timestamps: true });

export default mongoose.model('Attribute', attributeSchema);
