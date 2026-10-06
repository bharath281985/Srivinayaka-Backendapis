import Coupon from '../models/couponModel.js';

const getCoupons = async (req, res) => {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
};

const getPublicCoupons = async (req, res) => {
    const now = new Date();
    const coupons = await Coupon.find({
        isActive: true,
        $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
            {
                $or: [
                    { endDate: { $exists: false } },
                    { endDate: null },
                    { endDate: { $gte: now } },
                    { expiryDate: { $exists: false } },
                    { expiryDate: null },
                    { expiryDate: { $gte: now } },
                ],
            },
        ],
    })
        .sort({ createdAt: -1 })
        .select('code discountType discountValue minOrderAmount type endDate expiryDate startDate')
        .lean();

    res.json(coupons);
};
const sanitizeDates = (body) => {
    const b = { ...body };
    if (b.startDate === '' || b.startDate == null) delete b.startDate; else b.startDate = new Date(b.startDate);
    if (b.endDate === '' || b.endDate == null) delete b.endDate; else b.endDate = new Date(b.endDate);
    if (b.expiryDate === '' || b.expiryDate == null) delete b.expiryDate; else b.expiryDate = new Date(b.expiryDate);
    return b;
};

const createCoupon = async (req, res) => {
    try {
        const body = sanitizeDates(req.body);
        const coupon = await Coupon.create(body);
        res.status(201).json(coupon);
    } catch (err) { res.status(400).json({ message: err.message }); }
};
const updateCoupon = async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    const body = sanitizeDates(req.body);
    Object.assign(coupon, body);
    const updated = await coupon.save();
    res.json(updated);
};
const deleteCoupon = async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    await coupon.deleteOne();
    res.json({ message: 'Coupon removed' });
};
const validateCoupon = async (req, res) => {
    const { code, orderAmount, userId } = req.body;
    const coupon = await Coupon.findOne({ code: (code || '').toString().trim().toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });

    const now = new Date();
    const endDate = coupon.endDate || coupon.expiryDate;
    if (coupon.startDate && now < coupon.startDate) return res.status(400).json({ message: 'This coupon is not yet valid' });
    if (endDate && now > endDate) return res.status(400).json({ message: 'Coupon has expired' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: 'Coupon usage limit reached' });
    if (coupon.type === 'welcome') {
        if (!userId) return res.status(400).json({ message: 'Please sign in to use this coupon' });
        const used = coupon.usedBy && coupon.usedBy.some(id => id && id.toString() === userId.toString());
        if (used) return res.status(400).json({ message: 'You have already used this coupon' });
    }
    if (orderAmount < (coupon.minOrderAmount || 0)) return res.status(400).json({ message: `Minimum order amount is Rs. ${coupon.minOrderAmount}` });

    res.json(coupon);
};

/** Record that a coupon was used by a user (call after order is placed). */
const recordCouponUse = async (code, userId) => {
    const coupon = await Coupon.findOne({ code: (code || '').toString().trim().toUpperCase() });
    if (!coupon) return;
    coupon.usedCount = (coupon.usedCount || 0) + 1;
    if (coupon.type === 'welcome' && userId && !coupon.usedBy.some(id => id && id.toString() === userId.toString())) {
        coupon.usedBy = coupon.usedBy || [];
        coupon.usedBy.push(userId);
    }
    await coupon.save();
};

export { getCoupons, getPublicCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon, recordCouponUse };
