import Page from '../models/pageModel.js';

const DEFAULTS = [
    {
        slug: 'about-us',
        title: 'Our Heritage',
        content: '<p>Welcome to <strong>Sri Vinayaka Collections</strong>, where every thread weaves a tale of ancient artistry. Our journey began decades ago with a single mission: to preserve the soul of Indian handlooms.</p><p>We collaborate directly with 4th generation master weavers to bring you heirlooms that transcend time. From the intricate zari of Kanchipuram to the ethereal drapes of Banaras, our collection is a testament to the enduring spirit of the Indian artisan.</p>'
    },
    {
        slug: 'shipping-policy',
        title: 'Transnational Shipping',
        content: '<p>At Sri Vinayaka Collections, we ensure your heritage pieces reach you with the utmost care, wherever you are in the world.</p><ul><li><strong>Domestic Shipping:</strong> Delivered within 5-7 business days across India.</li><li><strong>International Shipping:</strong> We ship to 180+ countries with transit times of 10-15 business days.</li><li><strong>Packaging:</strong> Every saree is placed in a moisture-protected heritage box to ensure it arrives in pristine condition.</li></ul>'
    },
    {
        slug: 'returns-policy',
        title: 'Returns & Reversals',
        content: '<p>Your satisfaction is our primary covenant. If a piece does not resonate with your spirit, we offer a seamless return process.</p><ul><li><strong>Window:</strong> Requests must be initiated within 7 days of arrival.</li><li><strong>Condition:</strong> The piece must be unworn, with all original tags and Silk Mark certifications intact.</li><li><strong>Process:</strong> Refunds are initiated within 48 hours of the piece returning to our sanctuary after quality verification.</li></ul>'
    },
    {
        slug: 'fabric-care',
        title: 'Conservation Guide',
        content: '<p>A handcrafted heirloom is a living piece of art. To ensure its longevity across generations, please follow our conservation protocols:</p><ul><li><strong>Storage:</strong> Wrap your pure silk sarees in breathable muslin or cotton covers. Avoid plastic.</li><li><strong>Cleansing:</strong> Professional dry cleaning is mandatory for all pure silk and zari-enriched drapes.</li><li><strong>Usage:</strong> Refold your Kanjeevarams every 3 months to prevent permanent creases in the heavy silk.</li></ul>'
    },
    {
        slug: 'privacy-policy',
        title: 'Privacy Manifesto',
        content: '<p>Your trust is the foundation of our atelier. This manifesto outlines how we safeguard your digital presence.</p><p>We collect only the essentials needed to facilitate your journey—name, contact, and delivery details. Your data is encrypted and housed in secure vaults, never to be shared with third-party merchants. We believe in absolute transparency and your right to redact your history at any time.</p>'
    },
    {
        slug: 'terms-and-conditions',
        title: 'Terms of Decorum',
        content: '<p>By entering the Sri Vinayaka Collections sanctuary, you agree to our terms of decorum.</p><p>All designs, imagery, and artisan stories are the intellectual heritage of our atelier. We strive for absolute accuracy in color representation, though slight variations are the hallmark of authentic hand-dyeing. Orders are binding once transit begins, and we reserve the right to verify the sanctity of every return piece.</p>'
    },
    {
        slug: 'contact-us',
        title: 'Contact Concierge',
        content: '<p>Have a query about a specific weave or a bespoke bridal request? Our curators are ready to assist you in finding your perfect drape.</p><p>Please use the form below to transmit your message, or reach out to us directly via our digital mail for urgent matters.</p>'
    },
    {
        slug: 'delete-account',
        title: 'Final Partition',
        content: '<p>We are solemn to see you depart. The following partition process will permanently redact your presence from our archives.</p><p>Please ensure you have no pending orders or active service requests, as account deletion is irreversible and will result in the loss of all transaction history and loyalty tier benefits.</p>'
    },
];

const getPages = async (req, res) => {
    // Seed/Update defaults
    for (const item of DEFAULTS) {
        const page = await Page.findOne({ slug: item.slug });
        if (!page) {
            await Page.create(item);
        } else if (page.content.includes('Write your') || page.content.length < 50) {
            // Overwrite placeholder content with premium heritage content
            page.title = item.title;
            page.content = item.content;
            await page.save();
        }
    }
    res.json(await Page.find({}).sort({ slug: 1 }));
};
const getPageBySlug = async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    page ? res.json(page) : res.status(404).json({ message: 'Page not found' });
};
const updatePage = async (req, res) => {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    page.title = req.body.title ?? page.title;
    page.content = req.body.content ?? page.content;
    page.metadata = req.body.metadata ?? page.metadata;
    page.isActive = req.body.isActive ?? page.isActive;
    res.json(await page.save());
};
export { getPages, getPageBySlug, updatePage };
