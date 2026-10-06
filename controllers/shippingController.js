import Shipping from '../models/shippingModel.js';

const DEFAULTS = [
    { name: 'Standard Delivery', description: 'Delivered in 5-7 working days', price: 99, estimatedDays: '5-7 days', isActive: true },
    { name: 'Express Delivery', description: 'Delivered in 2-3 working days', price: 199, estimatedDays: '2-3 days', isActive: true },
    { name: 'Free Shipping', description: 'On orders above Rs. 2000', price: 0, estimatedDays: '7-10 days', isActive: true },
];

const getShipping = async (req, res) => {
    const count = await Shipping.countDocuments();
    if (count === 0) await Shipping.insertMany(DEFAULTS);
    res.json(await Shipping.find({}).sort({ price: 1 }));
};
const createShipping = async (req, res) => { try { res.status(201).json(await Shipping.create(req.body)); } catch (e) { res.status(400).json({ message: e.message }); } };
const updateShipping = async (req, res) => {
    const s = await Shipping.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Not found' });
    Object.assign(s, req.body);
    res.json(await s.save());
};
const deleteShipping = async (req, res) => {
    const s = await Shipping.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Not found' });
    await s.deleteOne();
    res.json({ message: 'Removed' });
};
export { getShipping, createShipping, updateShipping, deleteShipping };
