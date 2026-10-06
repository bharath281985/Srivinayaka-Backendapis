import AppPromo from '../models/appPromoModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const getAppPromo = async (req, res) => {
    try {
        let promo = await AppPromo.findOne({ isActive: true });
        if (!promo) {
            promo = await AppPromo.create({
                badge: 'The Atelier in your Pocket',
                title: 'Experience Heritage, Refined for Mobile.',
                description: 'Our bespoke collections are now closer than ever. Enjoy seamless browsing, augmented reality trials, and early access to drops only on our official mobile flagship.',
                mockupImage: toPublicUrl('/uploads/pure_silk.png', req),
                appleStoreLink: '#',
                playStoreLink: '#',
                isActive: true
            });
        }
        promo.mockupImage = toPublicUrl(promo.mockupImage, req);
        if (promo.backgroundImage) {
            promo.backgroundImage = toPublicUrl(promo.backgroundImage, req);
        }
        if (promo.mockupImages && promo.mockupImages.length > 0) {
            promo.mockupImages = promo.mockupImages.map(img => toPublicUrl(img, req));
        }
        res.json(promo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAppPromo = async (req, res) => {
    try {
        let promo = await AppPromo.findOne();
        if (promo) {
            Object.assign(promo, req.body);
            await promo.save();
        } else {
            promo = await AppPromo.create(req.body);
        }
        res.json(promo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export { getAppPromo, updateAppPromo };
