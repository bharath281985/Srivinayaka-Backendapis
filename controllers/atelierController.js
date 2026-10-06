import AtelierCycle from '../models/atelierCycleModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const getAtelierCycle = async (req, res) => {
    try {
        let cycle = await AtelierCycle.findOne({ isActive: true });
        if (!cycle) {
            cycle = await AtelierCycle.create({
                title: 'The 60-Day Atelier Cycle',
                description: 'True luxury cannot be rushed. From the selection of organic dyes in the foothills of the Himalayas to the final precision of the loom in Varanasi, every Sri Vinayaka Collections saree is a testament to the virtue of patience.',
                steps: [
                    { num: '01', title: 'The Vision & Draft', description: 'Master weavers sketch patterns based on architectural fractals and floral geometry.' },
                    { num: '02', title: 'The Silk Alchemy', description: 'Silk threads are treated with natural botanical extracts to achieve the perfect depth of hue.' },
                    { num: '03', title: 'The Sacred Weave', description: 'Up to three artisans work simultaneously on a single loom for up to 12 hours a day.' }
                ],
                image1: toPublicUrl('/uploads/modern_banarasi.png', req),
                image2: toPublicUrl('/uploads/banarasi.png', req),
                isActive: true
            });
        }
        cycle.image1 = toPublicUrl(cycle.image1, req);
        cycle.image2 = toPublicUrl(cycle.image2, req);
        res.json(cycle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAtelierCycle = async (req, res) => {
    try {
        let cycle = await AtelierCycle.findOne();
        if (cycle) {
            Object.assign(cycle, req.body);
            await cycle.save();
        } else {
            cycle = await AtelierCycle.create(req.body);
        }
        res.json(cycle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export { getAtelierCycle, updateAtelierCycle };
