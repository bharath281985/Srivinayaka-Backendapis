import Banner from '../models/bannerModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const getBanners = async (req, res) => {
    const banners = await Banner.find({}).sort({ position: 1 });
    res.json(
        banners.map((b) => ({
            ...b.toObject(),
            imageUrl: toPublicUrl(b.imageUrl, req),
            sideImageUrl: toPublicUrl(b.sideImageUrl, req),
            sideImageUrls: (b.sideImageUrls || []).map(img => toPublicUrl(img, req)),
        })),
    );
};
const createBanner = async (req, res) => { try { res.status(201).json(await Banner.create(req.body)); } catch (e) { res.status(400).json({ message: e.message }); } };
const updateBanner = async (req, res) => {
    const b = await Banner.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });
    Object.assign(b, req.body);
    res.json(await b.save());
};
const deleteBanner = async (req, res) => {
    const b = await Banner.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });
    await b.deleteOne();
    res.json({ message: 'Removed' });
};
export { getBanners, createBanner, updateBanner, deleteBanner };
