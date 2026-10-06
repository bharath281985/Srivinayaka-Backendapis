import mongoose from 'mongoose';

const pushNotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    redirectType: {
      type: String,
      enum: ['Category', 'Product', 'URL', 'None'],
      default: 'None',
    },
    redirectId: { type: String, default: '' },
    scheduleTime: { type: Date },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Sent', 'Failed'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

pushNotificationSchema.index({ scheduleTime: -1 });

export default mongoose.model('PushNotification', pushNotificationSchema);
