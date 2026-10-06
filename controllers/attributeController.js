import Attribute from '../models/attributeModel.js';

const getAttributes = async (req, res) => { res.json(await Attribute.find({}).sort({ name: 1 })); };
const createAttribute = async (req, res) => { try { res.status(201).json(await Attribute.create(req.body)); } catch (e) { res.status(400).json({ message: e.message }); } };
const updateAttribute = async (req, res) => {
    const attr = await Attribute.findById(req.params.id);
    if (!attr) return res.status(404).json({ message: 'Not found' });
    attr.name = req.body.name ?? attr.name;
    attr.values = req.body.values ?? attr.values;
    res.json(await attr.save());
};
const deleteAttribute = async (req, res) => {
    const attr = await Attribute.findById(req.params.id);
    if (!attr) return res.status(404).json({ message: 'Not found' });
    await attr.deleteOne();
    res.json({ message: 'Removed' });
};
export { getAttributes, createAttribute, updateAttribute, deleteAttribute };
