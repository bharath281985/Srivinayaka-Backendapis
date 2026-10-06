import FAQ from '../models/faqModel.js';
const DEFAULTS = [
    { question: 'How long does delivery take?', answer: 'Standard shipping takes 5-7 business days within India. International shipping takes 10-15 business days. Custom stitching may add 2-3 additional days.', category: 'Shipping', order: 1 },
    { question: 'How do I know the silk is authentic?', answer: 'Every pure silk saree from our collection comes with the "Silk Mark" of India—a certification of 100% natural and pure silk. We also provide purity certificates for our gold zari.', category: 'Products', order: 2 },
    { question: 'Can I track my weave’s journey?', answer: 'Absolutely. Use our "Track Your Heritage" portal with your Order ID to see your drape’s progress from the loom to our quality sanctuary and finally to your doorstep.', category: 'General', order: 3 },
    { question: 'Do you offer international fulfillment?', answer: 'We deliver heritage globally to 180+ countries. Shipping costs are calculated at checkout based on weight and destination.', category: 'Shipping', order: 4 },
    { question: 'Return protocol for heritage pieces?', answer: 'We offer a 7-day exchange window for all unworn pieces with tags intact. Please read our "Returns Policy" for specific category exclusions.', category: 'Returns', order: 5 },
    { question: 'What payment methods do you accept?', answer: 'We accept all major credit/debit cards (Visa, Mastercard, Amex), UPI, and net banking via our secure gateway. For international orders, we support PayPal and international card processing.', category: 'Payment', order: 6 },
    { question: 'Is Cash on Delivery available?', answer: 'Yes, Cash on Delivery is available for domestic orders within India for values up to ₹10,000. For higher value heritage pieces, we require secure prepaid transactions.', category: 'Payment', order: 7 },
    { question: 'How do I care for my Banarasi silk?', answer: 'Silk drapes should only be dry cleaned. Store them wrapped in a clean muslin cloth in a cool, dry place. Avoid using plastic covers or hanging them for long periods.', category: 'Products', order: 8 },
    { question: 'Can I change my delivery address?', answer: 'Address changes are permitted within 24 hours of placing the order, provided the piece has not entered the "Transit" stage of our fulfillment process.', category: 'Shipping', order: 9 },
    { question: 'Are there any customs duties?', answer: 'For international shipments, customs duties or import taxes may be levied by the destination country. These remain the responsibility of the collector (customer).', category: 'Shipping', order: 10 },
];

const getFAQs = async (req, res) => {
    try {
        const count = await FAQ.countDocuments();
        // If the user is asking to 'add all content' and it's missing or they want a reset
        if (count < DEFAULTS.length) {
            await FAQ.deleteMany({}); // Clear to ensure clean categories match
            await FAQ.insertMany(DEFAULTS);
        }
        const faqs = await FAQ.find({}).sort({ order: 1, createdAt: 1 });
        res.json(faqs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to synchronize archives', error: error.message });
    }
};
const createFAQ = async (req, res) => { try { res.status(201).json(await FAQ.create(req.body)); } catch (e) { res.status(400).json({ message: e.message }); } };
const updateFAQ = async (req, res) => {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: 'Not found' });
    Object.assign(faq, req.body);
    res.json(await faq.save());
};
const deleteFAQ = async (req, res) => {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: 'Not found' });
    await faq.deleteOne();
    res.json({ message: 'Removed' });
};
export { getFAQs, createFAQ, updateFAQ, deleteFAQ };
