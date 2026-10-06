import BrandValue from '../models/brandValueModel.js';

const defaultValues = [
    { title: 'Purity Guaranteed', description: 'Silk Mark Certified Authentic Weaver Collections', icon: 'ShieldCheck', position: 1 },
    { title: 'Ethereal Drapes', description: 'Lightweight & Hand-curated for Modern Comfort', icon: 'Wind', position: 2 },
    { title: 'Express Transit', description: 'Secure Global Fulfillment to 180+ Destinations', icon: 'Truck', position: 3 },
    { title: 'Heritage Exchange', description: 'Hassle-free 7 Day Seamless Returns Policy', icon: 'RefreshCcw', position: 4 }
];

const getBrandValues = async (req, res) => {
    try {
        let values = await BrandValue.find({}).sort({ position: 1 });
        if (values.length === 0) {
            await BrandValue.insertMany(defaultValues);
            values = await BrandValue.find({}).sort({ position: 1 });
        }
        res.json(values);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createBrandValue = async (req, res) => {
    try {
        const newValue = await BrandValue.create(req.body);
        res.status(201).json(newValue);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateBrandValue = async (req, res) => {
    try {
        const value = await BrandValue.findById(req.params.id);
        if (!value) return res.status(404).json({ message: 'Brand value not found' });
        Object.assign(value, req.body);
        res.json(await value.save());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteBrandValue = async (req, res) => {
    try {
        const value = await BrandValue.findById(req.params.id);
        if (!value) return res.status(404).json({ message: 'Brand value not found' });
        await value.deleteOne();
        res.json({ message: 'Removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getBrandValues, createBrandValue, updateBrandValue, deleteBrandValue };
