 import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'User',
        },
        orderItems: [
            {
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                image: { type: String, required: true },
                price: { type: Number, required: true },
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: 'Product',
                },
                variant: {
                    type: mongoose.Schema.Types.Mixed,
                    default: null,
                },
                originalMrp: {
                    type: Number,
                    default: 0,
                },
                originalBasePrice: {
                    type: Number,
                    default: 0,
                },
                // B2C Saree specific add-ons recorded for fulfillment
                hasFallPico: { type: Boolean, default: false },
                hasUnderskirt: { type: Boolean, default: false },
            },
        ],
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
            phone: { type: String },
            addressType: { type: String, enum: ['Home', 'Office', 'Other', 'Store Pickup'], default: 'Home' },
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        paymentResult: {
            id: { type: String },
            status: { type: String },
            update_time: { type: String },
            email_address: { type: String },
            status_message: { type: String },
        },
        itemsPrice: { type: Number, default: 0 },
        taxPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        shippingPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        shippingMethod: { type: String },
        couponCode: { type: String },
        discountAmount: { type: Number, default: 0 },
        totalPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        stockAdjusted: {
            type: Boolean,
            default: false,
        },
        stockAdjustedAt: {
            type: Date,
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: false,
        },
        paidAt: {
            type: Date,
        },
        isDelivered: {
            type: Boolean,
            required: true,
            default: false,
        },
        deliveredAt: {
            type: Date,
        },
        // Tracking Saree Specific Fulfillment
        orderStatus: {
            type: String,
            enum: [
                'Order Confirmed',
                'Processing',
                'In-Production',
                'Order Packed',
                'Shipped',
                'Out for Delivery',
                'Ready to Pickup',
                'Delivered',
                'Canceled',
                'Returned',
            ],
            default: 'Order Confirmed'
        }
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ isPaid: 1 });
orderSchema.index({ paymentMethod: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
