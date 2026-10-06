import InstagramFeed from '../models/instagramModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const getInstagramFeed = async (req, res) => {
    try {
        let feed = await InstagramFeed.findOne({ isActive: true });
        if (!feed) {
            feed = await InstagramFeed.create({
                badge: 'Visual Dialogue',
                handle: '@srivinayakacollections',
                posts: [
                    { image: toPublicUrl('/uploads/chanderi.png', req) },
                    { image: toPublicUrl('/uploads/cotton_silk.png', req) },
                    { image: toPublicUrl('/uploads/organza.png', req) },
                    { image: toPublicUrl('/uploads/modern_banarasi.png', req) }
                ]
            });
        }
        feed.posts = (feed.posts || []).map((p) => {
            const postObj = typeof p.toObject === 'function' ? p.toObject() : p;
            return {
                ...postObj,
                image: toPublicUrl(postObj.image, req),
            };
        });
        res.json(feed);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateInstagramFeed = async (req, res) => {
    try {
        let feed = await InstagramFeed.findOne();
        if (feed) {
            Object.assign(feed, req.body);
            await feed.save();
        } else {
            feed = await InstagramFeed.create(req.body);
        }
        res.json(feed);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export { getInstagramFeed, updateInstagramFeed };
