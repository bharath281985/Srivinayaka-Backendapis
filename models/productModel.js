import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

const variantSchema = new mongoose.Schema({
    color: { type: String, required: true },
    colorHex: { type: String, default: '#808080' },
    size: { type: String, default: 'Free Size' },
    sku: { type: String, required: true },
    basePrice: { type: Number, default: 0 },
    mrpPrice: { type: Number, default: 0 },
    additionalPrice: { type: Number, default: 0 },
    countInStock: { type: Number, required: true, default: 0 },
    imageUrl: { type: String },
});

const productSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        name: {
            type: String,
            required: true,
        },
        sku: {
            type: String,
            required: true,
            unique: true,
        },
        images: [
            {
                type: String, // URL of the image
                required: true,
            }
        ],
        brand: {
            type: String, // Weaver or Brand Name
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Category',
        },
        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
        childCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
        description: {
            type: String,
            required: true,
        },
        fabric: {
            type: String,
            required: true,
        },
        zariType: {
            type: String,
        },
        color: {
            type: String,
        },
        occasion: {
            type: String,
        },
        hasBlousePiece: {
            type: Boolean,
            default: true,
        },
        sareeLength: {
            type: String,
            default: '5.5 meters',
        },
        blouseLength: {
            type: String,
            default: '0.8 meters',
        },
        reviews: [reviewSchema],
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
        basePrice: {
            type: Number,
            required: true,
            default: 0,
        },
        discountPrice: {
            type: Number,
            default: 0,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isTrending: {
            type: Boolean,
            default: false,
        },
        isBestSeller: {
            type: Boolean,
            default: false,
        },
        isNewArrival: {
            type: Boolean,
            default: false,
        },
        isWeekendSale: {
            type: Boolean,
            default: false,
        },
        isRegularCollection: {
            type: Boolean,
            default: false,
        },
        seoTitle: {
            type: String,
            default: '',
        },
        seoDescription: {
            type: String,
            default: '',
        },
        slug: {
            type: String,
            unique: true,
            sparse: true,
        },
        countInStock: {
            type: Number,
            required: true,
            default: 0,
        },
        variants: [variantSchema],
        videoUrl: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isTrending: 1 });
productSchema.index({ isBestSeller: 1 });
productSchema.index({ isNewArrival: 1 });
productSchema.index({ sku: 1 }, { unique: true });

// Automatically generate a URL-friendly slug from the product name if missing.
productSchema.pre('save', async function (next) {
    if (!this.isModified('name') && this.slug) {
        return next();
    }

    if (!this.name) {
        return next();
    }

    const baseSlug = this.name
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    if (!baseSlug) {
        return next();
    }

    let slug = baseSlug;
    let counter = 1;
    const ProductModel = this.constructor;

    while (await ProductModel.findOne({ slug, _id: { $ne: this._id } }).lean()) {
        slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
    next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
