import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

// @desc    Fetch all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
    const { level, parent, showInMobile } = req.query;
    const filter = {};
    if (level) filter.level = Number(level);
    if (parent) filter.parent = parent;
    if (showInMobile !== undefined) filter.showInMobile = showInMobile === 'true';
    const categories = await Category.find(filter).populate('parent', 'name').sort({ level: 1, mobileDisplayOrder: 1, name: 1 });
    res.json(
        categories.map((c) => ({
            ...c.toObject(),
            image: toPublicUrl(c.image, req),
            mobileBannerImage: toPublicUrl(c.mobileBannerImage, req),
        })),
    );
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    const { name, slug, description, parent, level, showInMobile, mobileDisplayOrder, mobileBannerImage, image } = req.body;

    const categoryExists = await Category.findOne({ slug });

    if (categoryExists) {
        res.status(400).json({ message: 'Category slug already exists' });
        return;
    }

    const category = new Category({
        name,
        slug,
        description,
        parent: parent || null,
        level: level || 1,
        showInMobile: showInMobile ?? true,
        mobileDisplayOrder: mobileDisplayOrder ?? 0,
        mobileBannerImage: mobileBannerImage || '',
        image: image || '',
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
        await Category.deleteOne({ _id: category._id });
        res.json({ message: 'Category removed' });
    } else {
        res.status(404).json({ message: 'Category not found' });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    const { name, slug, description, parent, level, showInMobile, mobileDisplayOrder, mobileBannerImage, image } = req.body;

    const category = await Category.findById(req.params.id);

    if (category) {
        category.name = name || category.name;
        category.slug = slug || category.slug;
        category.description = description || category.description;
        category.parent = parent || category.parent;
        category.level = level || category.level;
        if (showInMobile !== undefined) category.showInMobile = showInMobile;
        if (mobileDisplayOrder !== undefined) category.mobileDisplayOrder = mobileDisplayOrder;
        if (mobileBannerImage !== undefined) category.mobileBannerImage = mobileBannerImage;
        if (image !== undefined) category.image = image;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } else {
        res.status(404).json({ message: 'Category not found' });
    }
};

// @desc    Fetch categories for home with min price
// @route   GET /api/categories/home
// @access  Public
const getHomeCategories = async (req, res) => {
    try {
        const categories = await Category.find({ parent: null }).sort({ mobileDisplayOrder: 1, name: 1 });
        const categoriesWithPrice = await Promise.all(
            categories.map(async (c) => {
                // Find all subcategories and child categories to get the true min price
                const subCats = await Category.find({ parent: c._id });
                const childCats = await Category.find({ parent: { $in: subCats.map(s => s._id) } });
                const allCatIds = [c._id, ...subCats.map(s => s._id), ...childCats.map(s => s._id)];

                const minProduct = await Product.findOne({
                    $or: [
                        { category: { $in: allCatIds } },
                        { subCategory: { $in: allCatIds } },
                        { childCategory: { $in: allCatIds } }
                    ]
                }).sort({ basePrice: 1 }).select('basePrice');

                return {
                    ...c.toObject(),
                    image: toPublicUrl(c.image, req),
                    minPrice: minProduct ? minProduct.basePrice : 0,
                };
            })
        );
        res.json(categoriesWithPrice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getCategories, createCategory, deleteCategory, updateCategory, getHomeCategories };
