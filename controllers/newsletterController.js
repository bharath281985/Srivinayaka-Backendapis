import Newsletter from '../models/newsletterModel.js';

export const subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const existing = await Newsletter.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already subscribed' });

        const newSubscriber = new Newsletter({ email });
        await newSubscriber.save();

        res.status(201).json({ message: 'Successfully subscribed to the Heritage Circle' });
    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllSubscribers = async (req, res) => {
    try {
        const subscribers = await Newsletter.find().sort({ subscribedAt: -1 });
        res.status(200).json(subscribers);
    } catch (error) {
        console.error('Get newsletter subscribers error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteSubscriber = async (req, res) => {
    try {
        await Newsletter.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Subscriber removed' });
    } catch (error) {
        console.error('Delete newsletter subscriber error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
