import mongoose from 'mongoose';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const normalizeVariants = (variants = [], fallbackBasePrice = 0, fallbackMrp = 0) =>
    variants.map((variant) => {
        const basePrice = Number(variant.basePrice ?? 0);
        const additionalPrice = Number(variant.additionalPrice ?? 0);
        const normalizedBasePrice = basePrice > 0
            ? basePrice
            : Math.max(Number(fallbackBasePrice || 0) + additionalPrice, 0);
        const mrpPrice = Number(variant.mrpPrice ?? 0);
        const normalizedMrpPrice = mrpPrice > 0
            ? mrpPrice
            : Math.max(Number(fallbackMrp || 0), normalizedBasePrice);

        return {
            ...variant,
            basePrice: normalizedBasePrice,
            mrpPrice: normalizedMrpPrice,
            additionalPrice: 0,
            countInStock: Number(variant.countInStock ?? 0),
        };
    });

const getProductPricingFromVariants = (variants = [], fallbackBasePrice = 0, fallbackMrp = 0) => {
    if (!variants.length) {
        return {
            basePrice: Number(fallbackBasePrice ?? 0),
            discountPrice: Number(fallbackMrp ?? 0),
        };
    }

    const sortedVariants = [...variants].sort((a, b) => Number(a.basePrice || 0) - Number(b.basePrice || 0));
    const cheapestVariant = sortedVariants[0];

    return {
        basePrice: Number(cheapestVariant?.basePrice || 0),
        discountPrice: Number(cheapestVariant?.mrpPrice || cheapestVariant?.basePrice || 0),
    };
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    const {
        category,
        subCategory,
        childCategory,
        featured,
        trending,
        bestSeller,
        newArrival,
        q,
        minPrice,
        maxPrice,
        weekendSale,
        regularCollection,
        sort = 'newest',
        page = 1,
        limit = 20,
    } = req.query;

    const filter = {};
    if (category) {
        // Check if category is a valid ObjectId, if not, it's a slug
        const isValidId = /^[0-9a-fA-F]{24}$/.test(category);
        if (isValidId) {
            filter.category = category;
        } else {
            // It's a slug, we need to find the ID
            const cat = await mongoose.model('Category').findOne({ slug: category });
            if (cat) filter.category = cat._id;
        }
    }
    if (subCategory) filter.subCategory = subCategory;
    if (childCategory) filter.childCategory = childCategory;
    if (bestSeller === 'true') filter.isBestSeller = true;
    if (newArrival === 'true') filter.isNewArrival = true;
    if (featured === 'true') filter.isFeatured = true;
    if (weekendSale === 'true') filter.isWeekendSale = true;
    if (regularCollection === 'true') filter.isRegularCollection = true;
    if (q) {
        // Find all categories, subcategories, or child categories matching the query name
        const matchingCategories = await Category.find({
            name: { $regex: q, $options: 'i' }
        }).select('_id');
        const categoryIds = matchingCategories.map(c => c._id);

        filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { sku: { $regex: q, $options: 'i' } },
            { brand: { $regex: q, $options: 'i' } },
            { fabric: { $regex: q, $options: 'i' } },
            { color: { $regex: q, $options: 'i' } },
            { occasion: { $regex: q, $options: 'i' } },
            { pattern: { $regex: q, $options: 'i' } },
            { zariType: { $regex: q, $options: 'i' } },
            { category: { $in: categoryIds } },
            { subCategory: { $in: categoryIds } },
            { childCategory: { $in: categoryIds } }
        ];
    }

    if (minPrice || maxPrice) {
        filter.basePrice = {};
        if (minPrice) filter.basePrice.$gte = Number(minPrice);
        if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    const sortOptions = {
        newest: { createdAt: -1 },
        price_asc: { basePrice: 1 },
        price_desc: { basePrice: -1 },
        rating: { rating: -1, numReviews: -1 },
    };

    const pageNum = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNum - 1) * pageSize;

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('category subCategory childCategory')
            .sort(sortOptions[sort] || sortOptions.newest)
            .skip(skip)
            .limit(pageSize),
        Product.countDocuments(filter),
    ]);

    res.json({
        products: products.map((p) => ({
            ...p.toObject(),
            images: (p.images || []).map((img) => toPublicUrl(img, req)),
        })),
        page: pageNum,
        pages: Math.ceil(total / pageSize),
        total,
    });
};

// @desc    Fetch single product (by ID or slug)
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    const idOrSlug = req.params.id;
    const isValidId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

    const query = isValidId ? { _id: idOrSlug } : { slug: idOrSlug };

    const product = await Product.findOne(query).populate('category subCategory childCategory');
    if (product) {
        res.json({
            ...product.toObject(),
            images: (product.images || []).map((img) => toPublicUrl(img, req)),
        });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const {
            name, basePrice, discountPrice, description, images, brand, category,
            subCategory, childCategory, fabric, color, pattern, occasion,
            zariType, sareeLength, blouseLength,
            countInStock, sku, isFeatured, isTrending, isBestSeller, isNewArrival, isWeekendSale, isRegularCollection, seoTitle, seoDescription, variants
        } = req.body;

        if (!category) {
            return res.status(400).json({ message: 'Category is required' });
        }

        const normalizedVariants = variants && variants.length > 0
            ? normalizeVariants(variants, basePrice, discountPrice)
            : [];
        const derivedPricing = getProductPricingFromVariants(normalizedVariants, basePrice, discountPrice);

        // Auto-compute total stock from variants if provided
        const totalStock = normalizedVariants.length > 0
            ? normalizedVariants.reduce((sum, v) => sum + (Number(v.countInStock) || 0), 0)
            : Number(countInStock ?? 0);

        const product = new Product({
            user: req.user._id,
            name: name || 'Sample Name',
            sku: sku || 'SKU-' + Date.now(),
            brand: brand || '',
            category,
            subCategory,
            childCategory,
            description: description || 'Sample Description',
            fabric: fabric || 'Sample Fabric',
            zariType: zariType || '',
            sareeLength: sareeLength || '5.5 meters',
            blouseLength: blouseLength || '0.8 meters',
            color: color || '',
            basePrice: normalizedVariants.length > 0 ? derivedPricing.basePrice : Number(basePrice ?? 0),
            discountPrice: normalizedVariants.length > 0 ? derivedPricing.discountPrice : Number(discountPrice ?? 0),
            countInStock: totalStock,
            images: images && images.length > 0
                ? images.map((img) => toPublicUrl(img, req))
                : ['https://images.unsplash.com/photo-1583391733958-d25e07fac6fc?auto=format&fit=crop&q=80'],
            pattern,
            occasion,
            isFeatured: isFeatured ?? false,
            isTrending: isTrending ?? false,
            isBestSeller: isBestSeller ?? false,
            isNewArrival: isNewArrival ?? false,
            isWeekendSale: isWeekendSale ?? false,
            isRegularCollection: isRegularCollection ?? false,
            seoTitle: seoTitle || '',
            seoDescription: seoDescription || '',
            variants: normalizedVariants,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await Product.deleteOne({ _id: product._id });
        res.json({ message: 'Product removed' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const {
            name, basePrice, discountPrice, description, images, brand, category,
            subCategory, childCategory, fabric, color, pattern, occasion,
            zariType, sareeLength, blouseLength,
            countInStock, sku, isFeatured, isTrending, isBestSeller, isNewArrival, isWeekendSale, isRegularCollection, seoTitle, seoDescription, variants
        } = req.body;

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.name = name ?? product.name;
        const normalizedVariants = variants !== undefined
            ? normalizeVariants(variants, basePrice ?? product.basePrice, discountPrice ?? product.discountPrice)
            : product.variants;
        const derivedPricing = getProductPricingFromVariants(
            normalizedVariants,
            basePrice ?? product.basePrice,
            discountPrice ?? product.discountPrice
        );

        product.basePrice = variants !== undefined
            ? derivedPricing.basePrice
            : (basePrice ?? product.basePrice);
        product.discountPrice = variants !== undefined
            ? derivedPricing.discountPrice
            : (discountPrice ?? product.discountPrice);
        product.description = description ?? product.description;
        product.images = images !== undefined
            ? images.map((img) => toPublicUrl(img, req))
            : product.images;
        product.brand = brand ?? product.brand;
        product.category = category ?? product.category;
        product.subCategory = subCategory ?? product.subCategory;
        product.childCategory = childCategory ?? product.childCategory;
        product.fabric = fabric ?? product.fabric;
        product.zariType = zariType ?? product.zariType;
        product.sareeLength = sareeLength ?? product.sareeLength;
        product.blouseLength = blouseLength ?? product.blouseLength;
        product.color = color ?? product.color;
        product.pattern = pattern ?? product.pattern;
        product.occasion = occasion ?? product.occasion;
        product.sku = sku ?? product.sku;
        product.isFeatured = isFeatured ?? product.isFeatured;
        product.isTrending = isTrending ?? product.isTrending;
        product.isBestSeller = isBestSeller ?? product.isBestSeller;
        product.isNewArrival = isNewArrival ?? product.isNewArrival;
        product.isWeekendSale = isWeekendSale ?? product.isWeekendSale;
        product.isRegularCollection = isRegularCollection ?? product.isRegularCollection;
        product.seoTitle = seoTitle ?? product.seoTitle;
        product.seoDescription = seoDescription ?? product.seoDescription;

        // Update variants and auto-recompute total stock
        if (variants !== undefined) {
            product.variants = normalizedVariants;
            product.countInStock = normalizedVariants.reduce((sum, v) => sum + (Number(v.countInStock) || 0), 0);
        } else {
            product.countInStock = countInStock ?? product.countInStock;
        }

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
        const alreadyReviewed = product.reviews.find(
            (r) => r.user.toString() === req.user._id.toString()
        );

        if (alreadyReviewed) {
            res.status(400).json({ message: 'Product already reviewed' });
            return;
        }

        const review = {
            name: req.user.name,
            rating: Number(rating),
            comment,
            user: req.user._id,
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.rating =
            product.reviews.reduce((acc, item) => item.rating + acc, 0) /
            product.reviews.length;

        await product.save();
        res.status(201).json({ message: 'Review added' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Delete a review
// @route   DELETE /api/products/:id/reviews/:reviewId
// @access  Private/Admin
const deleteProductReview = async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        const reviewIndex = product.reviews.findIndex(r => r._id.toString() === req.params.reviewId);
        if (reviewIndex !== -1) {
            product.reviews.splice(reviewIndex, 1);
            product.numReviews = product.reviews.length;
            if (product.reviews.length > 0) {
                product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
            } else {
                product.rating = 0;
            }
            await product.save();
            res.json({ message: 'Review deleted successfully' });
        } else {
            res.status(404).json({ message: 'Review not found' });
        }
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Backfill slugs for existing products
// @route   POST /api/products/backfill-slugs
// @access  Private/Admin
const backfillProductSlugs = async (req, res) => {
    try {
        const products = await Product.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
        let updatedCount = 0;

        for (const product of products) {
            // pre-save hook will generate a unique slug from name
            await product.save();
            updatedCount += 1;
        }

        res.json({ message: 'Product slugs backfilled', updated: updatedCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export {
    getProducts,
    getProductById,
    createProduct,
    deleteProduct,
    updateProduct,
    createProductReview,
    deleteProductReview,
    backfillProductSlugs
};
