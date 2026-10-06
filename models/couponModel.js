import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0 },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    /** @deprecated use startDate/endDate */
    expiryDate: { type: Date },
    /** When coupon becomes valid (cart/order date must be >= startDate) */
    startDate: { type: Date },
    /** When coupon expires (cart/order date must be <= endDate) */
    endDate: { type: Date },
    /** welcome = 1-time per user; regular = reusable within maxUses */
    type: { type: String, enum: ['welcome', 'regular'], default: 'regular' },
    /** User IDs who have used this coupon (for welcome type) */
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
