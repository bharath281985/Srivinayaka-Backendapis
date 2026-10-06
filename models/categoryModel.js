import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        level: {
            type: Number,
            required: true,
            default: 1, // 1: Main Category, 2: Subcategory, 3: Child Category
        },
        showInMobile: {
            type: Boolean,
            default: true,
        },
        mobileDisplayOrder: {
            type: Number,
            default: 0,
        },
        mobileBannerImage: {
            type: String,
            default: '',
        },
        image: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
