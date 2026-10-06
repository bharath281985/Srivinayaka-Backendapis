import mongoose from 'mongoose';

const mobileBannerSchema = new mongoose.Schema(
  {
    bannerImage: { type: String, required: true },
    bannerType: {
      type: String,
      enum: ['Home', 'Promotional', 'Festival'],
      default: 'Home',
    },
    redirectType: {
      type: String,
      enum: ['Category', 'Product', 'URL'],
      required: true,
      default: 'Category',
    },
    redirectId: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    activeStatus: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

mobileBannerSchema.index({ activeStatus: 1, startDate: 1, endDate: 1, displayOrder: 1 });

export default mongoose.model('MobileBanner', mobileBannerSchema);
