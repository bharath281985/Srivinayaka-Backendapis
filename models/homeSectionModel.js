import mongoose from 'mongoose';

const homeSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    redirectType: {
      type: String,
      enum: ['Category', 'Product', 'URL'],
      required: true,
      default: 'Category',
    },
    redirectId: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

homeSectionSchema.index({ status: 1, displayOrder: 1 });

export default mongoose.model('HomeSection', homeSectionSchema);
