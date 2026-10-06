import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import axios from 'axios';

const transporter = nodemailer.createTransport({
    host: 'mail.srivinayakacollections.com',
    port: 465,
    secure: true,
    auth: {
        user: 'info@srivinayakacollections.com',
        pass: '9rmEV{^C[z7~cp,p',
    },
});

const BRAND_TITLE = 'Sri Vinayaka Collections';
const BRAND_SUBTITLE = 'Your Fashion Partner';
const BRAND_WEBSITE = 'https://srivinayakacollections.com';
const ACCOUNT_URL = `${BRAND_WEBSITE}/account`;
const ADMIN_ORDERS_URL = 'https://admin.srivinayakacollections.com/orders';
const ADMIN_NOTIFICATION_EMAIL = 'srivinayaka.collection2930@gmail.com';
const INVOICE_ACCOUNT_DETAILS = {
    accountNumber: 'NO2311',
    customerId: '4002069569',
    fromName: 'SRI VINAYAKA COLLECTIONS',
    fromAddress1: 'H.No 6-4-469/1, Krishna Nagar Colony, Beside Axis Bank Lane, Musheerabad',
    fromAddress2: 'Hyderbad-500080, Telangana',
    fromPhone: '9392239145, 6304199935',
};

const formatCurrency = (value = 0) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const safe = (value = '') => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isPickupOrder = (order = {}) => {
    const method = order?.shippingMethod || '';
    return method === 'Store Pickup' || method === 'Delivery By Rapido' || /rapido/i.test(method);
};

const getStatusMessage = (status, order = {}) => {
    const isPickup = isPickupOrder(order);
    switch (status) {
        case 'Order Confirmed':
            return isPickup
                ? 'Your store booking has been successfully placed and confirmed. We are preparing it for your collection.'
                : 'Your order has been successfully placed and confirmed. We are now preparing your selected pieces.';
        case 'Order Packed':
            return isPickup
                ? 'Your selected pieces have been packed and are being prepared for pickup.'
                : 'Your selected pieces have been packed and are ready for the next step.';
        case 'Shipped':
            return isPickup
                ? 'Your order is on the way to our store for collection.'
                : 'Your order is now on the way to your address.';
        case 'Ready to Pickup':
            return 'Your order is ready for pickup at our store. Please visit us to collect your items. Bring your order confirmation email when collecting it.';
        case 'Out for Delivery':
            return 'Your package is out for delivery and will reach you shortly.';
        case 'Delivered':
            return isPickup
                ? 'Your order has been picked up successfully. We hope you love every piece.'
                : 'Your order has been delivered successfully. We hope you love every piece.';
        case 'Canceled': return 'Your order has been cancelled.';
        case 'Returned': return 'Your returned item has been received and processed.';
        default: return 'The status of your order has been updated.';
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Order Confirmed': return '#f59e0b';
        case 'Delivered': return '#059669';
        case 'Shipped': return '#7c3aed';
        case 'Out for Delivery': return '#2563eb';
        case 'Ready to Pickup': return '#2563eb';
        case 'Canceled': return '#dc2626';
        default: return '#92400e';
    }
};

const getOrderSummary = (order) => {
    const orderItems = order.orderItems || [];
    const salePriceTotal = Number(order.itemsPrice || orderItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0));
    const discountAmount = Number(order.discountAmount || 0);
    const mrpTotal = salePriceTotal + discountAmount;
    const youSaved = Math.max(mrpTotal - salePriceTotal, 0);
    const taxPrice = Number(order.taxPrice || 0);
    const shippingPrice = Number(order.shippingPrice || 0);
    const totalPrice = Number(order.totalPrice || (salePriceTotal + taxPrice + shippingPrice));

    return {
        mrpTotal,
        salePriceTotal,
        youSaved,
        subtotal: salePriceTotal,
        taxPrice,
        shippingPrice,
        shippingMethod: order.shippingMethod || 'Shipping Charges',
        shippingEta: order.shippingMethod === 'Express Delivery'
            ? '2-3 Days'
            : order.shippingMethod === 'Standard Delivery'
                ? '5-7 Days'
                : '3-8 Days',
        totalPrice,
    };
};

const renderOrderItemsRows = (order) => (
    (order.orderItems || []).map((item) => `
        ${(() => {
            const itemImage = item.variant?.imageUrl || item.image || '';
            return itemImage ? `
        <tr>
            <td style="padding: 10px 0 0 0;">
                <img src="${safe(itemImage)}" alt="${safe(item.name)}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 10px; border: 1px solid #e5e7eb; display: inline-block; vertical-align: middle; margin-right: 10px;" />
                <span style="font-size: 14px; font-weight: 600; color: #1f2937; vertical-align: middle;">${safe(item.name)}</span>
                <span style="font-size: 14px; font-weight: 700; color: #1f2937; float: right;">${formatCurrency(Number(item.price || 0) * Number(item.qty || 0))}</span>
            </td>
        </tr>
            ` : `
        <tr>
            <td style="padding: 10px 0 4px 0;">
                <span style="font-size: 14px; font-weight: 600; color: #1f2937;">${safe(item.name)}</span>
                <span style="font-size: 14px; font-weight: 700; color: #1f2937; float: right;">${formatCurrency(Number(item.price || 0) * Number(item.qty || 0))}</span>
            </td>
        </tr>
            `;
        })()}
        ${(item.variant?.color || item.variant?.size || item.variant?.sku) ? `
        <tr>
            <td style="padding: 0 0 4px 0;">
                <span style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">
                    ${[
                        item.variant?.color ? `Color: ${safe(item.variant.color)}` : '',
                        item.variant?.size ? `Size: ${safe(item.variant.size)}` : '',
                        item.variant?.sku ? `SKU: ${safe(item.variant.sku)}` : '',
                    ].filter(Boolean).join(' | ')}
                </span>
            </td>
        </tr>
        ` : ''}
        <tr>
            <td style="padding: 0 0 10px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em;">QTY: ${Number(item.qty || 0)}</span>
            </td>
        </tr>
    `).join('')
);

const renderOrderSummaryCard = (order) => {
    const summary = getOrderSummary(order);
    const itemCount = (order.orderItems || []).reduce((s, i) => s + Number(i.qty || 0), 0);
    const shippingState = order.shippingAddress?.state || order.shippingAddress?.country || 'India';
    const ratePerItem = itemCount > 0 ? Math.round(summary.shippingPrice / itemCount) : summary.shippingPrice;
    return `
        <div style="background-color: #fff; padding: 28px; border-radius: 20px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
            <span style="font-size: 20px; font-weight: 700; color: #111827; display: block; margin-bottom: 20px;">Order Review</span>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${renderOrderItemsRows(order)}
                <tr><td colspan="2" style="padding-top: 20px;"></td></tr>

                <tr>
                    <td style="padding: 5px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280;">PRODUCT TOTAL (MRP)</td>
                    <td align="right" style="padding: 5px 0; font-size: 13px; font-weight: 600; color: #111827;">${formatCurrency(summary.mrpTotal)}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280;">SUBTOTAL</td>
                    <td align="right" style="padding: 5px 0; font-size: 13px; font-weight: 600; color: #111827;">${formatCurrency(summary.salePriceTotal)}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #16a34a;">DISCOUNT</td>
                    <td align="right" style="padding: 5px 0; font-size: 13px; font-weight: 700; color: #16a34a;">-${formatCurrency(summary.youSaved)}</td>
                </tr>
                ${summary.taxPrice > 0 ? `
                <tr>
                    <td style="padding: 5px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280;">ESTIMATED GST/TAX</td>
                    <td align="right" style="padding: 5px 0; font-size: 13px; font-weight: 600; color: #111827;">${formatCurrency(summary.taxPrice)}</td>
                </tr>` : ''}
                <tr>
                    <td style="padding: 5px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #16a34a;">${isPickupOrder(order) ? 'PICKUP FEE' : 'DELIVERY FEE'}</td>
                    <td align="right" style="padding: 5px 0; font-size: 13px; font-weight: 700; color: #16a34a;">${formatCurrency(summary.shippingPrice)}</td>
                </tr>
            </table>

            <!-- Shipping Protocol Box -->
            ${isPickupOrder(order) ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 16px; margin: 16px 0;">
                <div style="font-size: 10px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px;">🏍️ RAPIDO DELIVERY PROTOCOL</div>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="width: 50%;">
                            <div style="font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">QUANTITY</div>
                            <div style="font-size: 14px; font-weight: 700; color: #111827;">${itemCount} Unit${itemCount !== 1 ? 's' : ''}</div>
                        </td>
                        <td style="width: 50%;">
                            <div style="font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">FULFILLMENT</div>
                            <div style="font-size: 14px; font-weight: 700; color: #111827;">Delivery By Rapido</div>
                        </td>
                    </tr>
                </table>
                <div style="font-size: 9px; color: #4b5563; margin-top: 10px; line-height: 1.4;">Once your order is ready, Rapido will collect your order from our store and deliver it to your specified address.</div>
            </div>
            ` : `
            <div style="background-color: #fef9f0; border: 1px solid #fde9c6; border-radius: 14px; padding: 16px; margin: 16px 0;">
                <div style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px;">📦 SHIPPING PROTOCOL</div>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="width: 50%;">
                            <div style="font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">QUANTITY</div>
                            <div style="font-size: 14px; font-weight: 700; color: #111827;">${itemCount} Unit${itemCount !== 1 ? 's' : ''}</div>
                        </td>
                        <td style="width: 50%;">
                            <div style="font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">STATE</div>
                            <div style="font-size: 14px; font-weight: 700; color: #111827;">${safe(shippingState)}</div>
                        </td>
                    </tr>
                </table>
                <div style="margin-top: 12px;">
                    <span style="font-size: 14px; font-weight: 700; color: #111827;">rate: <span style="text-decoration: line-through;">${formatCurrency(ratePerItem)}</span> /item</span>
                </div>
                <div style="font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px;">${safe(summary.shippingEta)} DELIVERY</div>
            </div>
            `}

            <!-- Grand Total -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 4px;">
                <tr>
                    <td style="padding-top: 14px;">
                        <span style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280;">GRAND TOTAL</span>
                    </td>
                    <td align="right" style="padding-top: 14px;">
                        <span style="font-size: 22px; font-weight: 800; color: #111827; font-style: italic;">${formatCurrency(summary.totalPrice)}</span>
                    </td>
                </tr>
            </table>
        </div>
    `;
};

const renderShell = ({ eyebrow, title, message, body, ctaLabel, ctaUrl, footerNote, accentColor = '#92400e' }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #faf9f6; color: #374151;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px -10px rgba(146, 64, 14, 0.15); border: 1px solid #fef3c7;">
        <tr>
            <td align="center" style="background-color: #0c0a09; padding: 40px; border-bottom: 4px solid #b45309;">
                <img src="${BRAND_WEBSITE}/logo.png" alt="${BRAND_TITLE}" style="height: 80px; width: auto; margin-bottom: 20px; display: block;" />
                <h1 style="font-family: 'Playfair Display', serif; color: #fbbf24; margin: 0; font-size: 24px; letter-spacing: 0.1em; text-transform: uppercase;">${BRAND_TITLE}</h1>
                <p style="color: #fbbf24; font-size: 14px; font-weight: 700; margin-top: 10px; letter-spacing: 0.12em; margin-bottom: 24px;">${BRAND_SUBTITLE}</p>
                ${eyebrow ? `
                <div style="margin-top: 24px; border-top: 1px solid rgba(251, 191, 36, 0.12); padding-top: 24px;">
                    <span
                        style="
                            display: inline-block;
                            padding: 8px 22px;
                            border-radius: 999px;
                            background-color: #ecfdf5;
                            color: #047857;
                            font-size: 11px;
                            font-weight: 800;
                            letter-spacing: 0.16em;
                            text-transform: uppercase;
                            border: 1px solid rgba(4, 120, 87, 0.18);
                        "
                    >
                        ${safe(eyebrow)}
                    </span>
                </div>` : ''}
            </td>
        </tr>
        <tr>
            <td style="padding: 40px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h2 style="font-family: 'Playfair Display', serif; font-size: 28px; color: #0c0a09; margin: 0 0 16px 0; font-weight: 700; font-style: italic;">${title}</h2>
                    ${message ? `<p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0;">${message}</p>` : ''}
                </div>
                ${body || ''}
                ${ctaLabel && ctaUrl ? `<a href="${ctaUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #0c0a09; color: #ffffff; text-align: center; padding: 20px; border-radius: 14px; text-decoration: none; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px;">${safe(ctaLabel)}</a>` : ''}
            </td>
        </tr>
        <tr>
            <td style="background-color: #f9fafb; padding: 40px; text-align: center; border-top: 1px solid #f3f4f6;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">${footerNote || `${BRAND_TITLE}. For help, contact info@srivinayakacollections.com`}</p>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const buildInvoiceHtml = (order) => {
    const userName = safe(order.user?.name || 'Customer');
    const summaryCard = renderOrderSummaryCard(order);
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${safe(order._id)}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f8f8f8; color: #111827; margin: 0; padding: 32px; }
        .page { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; }
        .header { background: #0c0a09; color: #fbbf24; padding: 32px; }
        .header h1 { margin: 0; font-size: 28px; letter-spacing: 0.08em; text-transform: uppercase; }
        .header p { margin: 12px 0 0; font-size: 16px; color: #fbbf24; }
        .content { padding: 32px; }
        .meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
        .box { flex: 1; background: #faf9f6; border: 1px solid #ececec; border-radius: 14px; padding: 18px; }
        .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .invoice-panels { display: flex; gap: 16px; margin: 18px 0 24px; }
        .invoice-panel { flex: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; }
        .invoice-panel-title { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; font-weight: 700; }
        .invoice-line { margin: 4px 0; font-size: 14px; color: #111827; }
        .invoice-line strong { font-weight: 700; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <h1>${BRAND_TITLE}</h1>
            <p>${BRAND_SUBTITLE}</p>
        </div>
        <div class="content">
            <div class="meta">
                <div class="box">
                    <div class="label">Invoice For</div>
                    <div>${userName}</div>
                    ${order.user?.email ? `<div>${safe(order.user.email)}</div>` : ''}
                </div>
                <div class="box">
                    <div class="label">Order Details</div>
                    <div>Order ID: #${safe(order._id?.toString().slice(-8).toUpperCase())}</div>
                    <div>Delivered On: ${order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div>
                </div>
            </div>
            <div class="box" style="margin-bottom:24px;">
                <div class="label">Shipping Address</div>
                <div>${safe(order.shippingAddress?.address || '')}</div>
                <div>${safe(order.shippingAddress?.city || '')}, ${safe(order.shippingAddress?.postalCode || '')}</div>
                <div>${safe(order.shippingAddress?.country || '')}</div>
                ${order.shippingAddress?.phone ? `<div>Phone: ${safe(order.shippingAddress.phone)}</div>` : ''}
            </div>
            <div class="invoice-panels">
                <div class="invoice-panel">
                    <div class="invoice-panel-title">Account Details</div>
                    <div class="invoice-line"><strong>A/C:</strong> ${safe(INVOICE_ACCOUNT_DETAILS.accountNumber)}</div>
                    <div class="invoice-line"><strong>Customer ID:</strong> ${safe(INVOICE_ACCOUNT_DETAILS.customerId)}</div>
                </div>
                <div class="invoice-panel">
                    <div class="invoice-panel-title">From</div>
                    <div class="invoice-line"><strong>${safe(INVOICE_ACCOUNT_DETAILS.fromName)}</strong></div>
                    <div class="invoice-line">${safe(INVOICE_ACCOUNT_DETAILS.fromAddress1)}</div>
                    <div class="invoice-line">${safe(INVOICE_ACCOUNT_DETAILS.fromAddress2)}</div>
                    <div class="invoice-line"><strong>Cell:</strong> ${safe(INVOICE_ACCOUNT_DETAILS.fromPhone)}</div>
                </div>
            </div>
            ${summaryCard}
        </div>
    </div>
</body>
</html>
`;
};

export const buildInvoicePdfBuffer = (order) => new Promise((resolve, reject) => {
    (async () => {
        try {
            const doc = new PDFDocument({
                margin: 40,
                size: 'A4',
            });
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));

            const userName = safe(order.user?.name || 'Customer');
            const summary = getOrderSummary(order);

            const headerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

            // Header bar background
            doc
                .rect(doc.page.margins.left, doc.page.margins.top, headerWidth, 70)
                .fill('#0c0a09');

            // Try to draw logo on left side
            try {
                const logoResponse = await axios.get(`${BRAND_WEBSITE}/logo.png`, {
                    responseType: 'arraybuffer',
                    timeout: 4000,
                });
                const logoBuffer = Buffer.from(logoResponse.data);
                doc.image(
                    logoBuffer,
                    doc.page.margins.left + 16,
                    doc.page.margins.top + 10,
                    { width: 70, height: 50, fit: [70, 50] },
                );
            } catch {
                // If logo fails to load, just continue with text-only header
            }

            // Brand name and subtitle (slightly to the right of logo)
            const brandTextX = doc.page.margins.left + 100;
            doc
                .fillColor('#fbbf24')
                .fontSize(18)
                .text(BRAND_TITLE, brandTextX, doc.page.margins.top + 16, {
                    align: 'left',
                });

            doc
                .fontSize(10)
                .fillColor('#facc15')
                .text(BRAND_SUBTITLE, brandTextX, doc.page.margins.top + 36);

            // Invoice meta on right
            const rightX = doc.page.width - doc.page.margins.right - 200;
            const topY = doc.page.margins.top + 16;
            doc
                .fontSize(10)
                .fillColor('#e5e7eb')
                .text('Invoice', rightX, topY, { align: 'left' })
                .moveDown(0.2);
            doc
                .fontSize(12)
                .fillColor('#ffffff')
                .text(`#${safe(order._id?.toString().slice(-8).toUpperCase())}`, rightX, topY + 10);
            doc
                .fontSize(9)
                .fillColor('#e5e7eb')
                .text(`Date: ${new Date(order.deliveredAt || order.createdAt || Date.now()).toLocaleDateString('en-IN')}`, rightX, topY + 28);

            // Move cursor below header
            doc.y = doc.page.margins.top + 90;

            // Two-column details
            const startY = doc.y;
            const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 16) / 2;

            // Bill to
            doc
                .fontSize(10)
                .fillColor('#6b7280')
                .text('Bill To', doc.page.margins.left, startY);
            doc
                .fontSize(10)
                .fillColor('#111827')
                .text(userName);
            
            if (order.user?.email) {
                doc
                    .fontSize(10)
                    .fillColor('#4b5563')
                    .text(safe(order.user.email), { width: colWidth });
            }

            // Shipping address
            doc
                .fontSize(10)
                .fillColor('#6b7280')
                .text(isPickupOrder(order) ? 'Fulfillment: Rapido Delivery' : 'Shipping Address', doc.page.margins.left + colWidth + 16, startY);
            doc
                .moveDown(0.3)
                .fontSize(10)
                .fillColor('#111827');
            doc.text(safe(order.shippingAddress?.address || ''), {
                width: colWidth,
                continued: false,
            });
            doc.text(
                `${safe(order.shippingAddress?.city || '')} ${safe(order.shippingAddress?.postalCode || '')}`,
                { width: colWidth },
            );
            doc.text(safe(order.shippingAddress?.country || ''), { width: colWidth });
            if (order.shippingAddress?.phone) {
                doc.text(`Phone: ${safe(order.shippingAddress.phone)}`, { width: colWidth });
            }
            if (isPickupOrder(order)) {
                doc.moveDown(0.3)
                   .fontSize(8)
                   .fillColor('#6b7280')
                   .text(`Pickup Origin: ${safe(INVOICE_ACCOUNT_DETAILS.fromName)}, ${safe(INVOICE_ACCOUNT_DETAILS.fromAddress1)}`, { width: colWidth });
            }

            const infoY = doc.y + 12;
            const infoBoxHeight = 74;
            const infoBoxWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 16) / 2;
            const infoLeftX = doc.page.margins.left;
            const infoRightX = infoLeftX + infoBoxWidth + 16;

            doc
                .roundedRect(infoLeftX, infoY, infoBoxWidth, infoBoxHeight, 8)
                .fillAndStroke('#ffffff', '#e5e7eb');
            doc
                .roundedRect(infoRightX, infoY, infoBoxWidth, infoBoxHeight, 8)
                .fillAndStroke('#ffffff', '#e5e7eb');

            doc.fontSize(8).fillColor('#9ca3af').font('Helvetica-Bold')
                .text('Account Details', infoLeftX + 10, infoY + 8, { width: infoBoxWidth - 20 });
            doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold')
                .text(`A/C: ${INVOICE_ACCOUNT_DETAILS.accountNumber}`, infoLeftX + 10, infoY + 24, { width: infoBoxWidth - 20 });
            doc.fontSize(9).fillColor('#111827').font('Helvetica')
                .text(`Customer ID: ${INVOICE_ACCOUNT_DETAILS.customerId}`, infoLeftX + 10, infoY + 40, { width: infoBoxWidth - 20 });

            doc.fontSize(8).fillColor('#9ca3af').font('Helvetica-Bold')
                .text('From', infoRightX + 10, infoY + 8, { width: infoBoxWidth - 20 });
            doc.fontSize(9).fillColor('#111827').font('Helvetica-Bold')
                .text(INVOICE_ACCOUNT_DETAILS.fromName, infoRightX + 10, infoY + 24, { width: infoBoxWidth - 20 });
            doc.fontSize(8).fillColor('#111827').font('Helvetica')
                .text(INVOICE_ACCOUNT_DETAILS.fromAddress1, infoRightX + 10, infoY + 38, { width: infoBoxWidth - 20 });
            doc.text(INVOICE_ACCOUNT_DETAILS.fromAddress2, infoRightX + 10, infoY + 50, { width: infoBoxWidth - 20 });
            doc.text(`Cell: ${INVOICE_ACCOUNT_DETAILS.fromPhone}`, infoRightX + 10, infoY + 62, { width: infoBoxWidth - 20 });

            doc.y = infoY + infoBoxHeight + 10;
            doc.moveDown(2);

            // Items table header
            const tableTop = doc.y;
            const itemCols = [
                { label: '#', width: 24 },
                { label: 'Item', width: 240 },
                { label: 'Qty', width: 40 },
                { label: 'Price', width: 80 },
                { label: 'Total', width: 80 },
            ];

            let x = doc.page.margins.left;
            doc.fontSize(9).fillColor('#6b7280');
            itemCols.forEach((col) => {
                doc.text(col.label, x, tableTop, { width: col.width, align: col.label === '#' ? 'left' : 'right' });
                x += col.width;
            });

            // Header underline
            doc
                .moveTo(doc.page.margins.left, tableTop + 14)
                .lineTo(doc.page.width - doc.page.margins.right, tableTop + 14)
                .strokeColor('#e5e7eb')
                .lineWidth(1)
                .stroke();

            // Items rows
            let y = tableTop + 20;
            (order.orderItems || []).forEach((item, index) => {
                const lineTotal = Number(item.price || 0) * Number(item.qty || 0);
                x = doc.page.margins.left;
                doc.fontSize(10).fillColor('#111827');
                doc.text(String(index + 1), x, y, { width: itemCols[0].width, align: 'left' });
                x += itemCols[0].width;
                doc.text(safe(item.name), x, y, { width: itemCols[1].width, align: 'left' });
                if (item.variant?.color || item.variant?.size || item.variant?.sku) {
                    doc.fontSize(8).fillColor('#6b7280');
                    doc.text(
                        [
                            item.variant?.color ? `Color: ${safe(item.variant.color)}` : '',
                            item.variant?.size ? `Size: ${safe(item.variant.size)}` : '',
                            item.variant?.sku ? `SKU: ${safe(item.variant.sku)}` : '',
                        ].filter(Boolean).join(' | '),
                        x,
                        y + 11,
                        { width: itemCols[1].width, align: 'left' }
                    );
                    doc.fontSize(10).fillColor('#111827');
                }
                x += itemCols[1].width;
                doc.text(String(item.qty || 0), x, y, { width: itemCols[2].width, align: 'right' });
                x += itemCols[2].width;
                doc.text(formatCurrency(item.price || 0), x, y, { width: itemCols[3].width, align: 'right' });
                x += itemCols[3].width;
                doc.text(formatCurrency(lineTotal), x, y, { width: itemCols[4].width, align: 'right' });
                y += 18;

                // Row divider
                doc
                    .moveTo(doc.page.margins.left, y - 4)
                    .lineTo(doc.page.width - doc.page.margins.right, y - 4)
                    .strokeColor('#f3f4f6')
                    .lineWidth(0.5)
                    .stroke();
            });

            doc.moveDown(2);

            // Summary box — matches mobile Order Review format
            const summaryWidth = 240;
            const summaryX = doc.page.width - doc.page.margins.right - summaryWidth;
            const summaryY = doc.y;
            const itemCount = (order.orderItems || []).reduce((s, i) => s + Number(i.qty || 0), 0);
            const shippingState = order.shippingAddress?.state || order.shippingAddress?.country || 'India';
            const ratePerItem = itemCount > 0 ? Math.round(summary.shippingPrice / itemCount) : summary.shippingPrice;
            const pdfBoxHeight = isPickupOrder(order) 
                ? (summary.youSaved > 0 ? 120 : 105) 
                : (summary.youSaved > 0 ? 190 : 175);

            doc
                .roundedRect(summaryX, summaryY, summaryWidth, pdfBoxHeight, 10)
                .fillAndStroke('#f9fafb', '#e5e7eb');

            let sy = summaryY + 12;
            const pdfLine = (label, value, bold = false, accent = false) => {
                const col = accent ? '#16a34a' : '#4b5563';
                doc.fontSize(8).fillColor(col).font(bold ? 'Helvetica-Bold' : 'Helvetica')
                    .text(label, summaryX + 10, sy, { width: summaryWidth / 2, align: 'left' });
                doc.text(value, summaryX + summaryWidth / 2, sy, { width: summaryWidth / 2 - 10, align: 'right' });
                sy += 14;
            };

            pdfLine('PRODUCT TOTAL (MRP)', formatCurrency(summary.mrpTotal));
            pdfLine('SUBTOTAL', formatCurrency(summary.salePriceTotal));
            pdfLine('DISCOUNT', `- ${formatCurrency(summary.youSaved)}`, true, true);
            if (summary.taxPrice > 0) {
                pdfLine('ESTIMATED GST/TAX', formatCurrency(summary.taxPrice));
            }
            
            if (isPickupOrder(order)) {
                pdfLine('PICKUP FEE', formatCurrency(summary.shippingPrice), false, true);
            } else {
                pdfLine('DELIVERY FEE', formatCurrency(summary.shippingPrice), false, true);

                // Shipping Protocol mini-box
                sy += 4;
                doc.roundedRect(summaryX + 8, sy, summaryWidth - 16, 52, 6).fillAndStroke('#fff8f0', '#fde9c6');
                doc.fontSize(7).fillColor('#9ca3af').font('Helvetica-Bold')
                    .text('SHIPPING PROTOCOL', summaryX + 14, sy + 6, { width: summaryWidth - 28 });
                doc.fontSize(9).fillColor('#111827').font('Helvetica-Bold')
                    .text(`${itemCount} Unit${itemCount !== 1 ? 's' : ''}`, summaryX + 14, sy + 17)
                    .text(safe(shippingState), summaryX + summaryWidth / 2, sy + 17, { width: summaryWidth / 2 - 12, align: 'right' });
                doc.fontSize(8).fillColor('#111827').font('Helvetica')
                    .text(`rate: ${formatCurrency(ratePerItem)} /item   |   ${safe(summary.shippingEta)} DELIVERY`, summaryX + 14, sy + 32, { width: summaryWidth - 28 });
                sy += 60;
            }

            // Grand Total
            doc.moveTo(summaryX + 10, sy).lineTo(summaryX + summaryWidth - 10, sy)
                .strokeColor('#d1d5db').lineWidth(1).stroke();
            sy += 8;
            doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold')
                .text('GRAND TOTAL', summaryX + 10, sy, { width: summaryWidth / 2, align: 'left' });
            doc.fontSize(13).fillColor('#111827').font('Helvetica-Bold')
                .text(formatCurrency(summary.totalPrice), summaryX + summaryWidth / 2, sy - 2, { width: summaryWidth / 2 - 10, align: 'right' });

            // Footer note
            doc.moveDown(3);
            doc
                .fontSize(8)
                .fillColor('#9ca3af')
                .text(
                    `${BRAND_TITLE} • This is a computer generated invoice. For any support, write to info@srivinayakacollections.com`,
                    doc.page.margins.left,
                    doc.y,
                    {
                        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                        align: 'center',
                    },
                );

            doc.end();
        } catch (err) {
            reject(err);
        }
    })();
});

export const sendOrderStatusEmail = async (order) => {
    if (!order.user?.email) return;

    const status = order.orderStatus || 'Order Confirmed';
    const statusMessage = getStatusMessage(status, order);
    const statusColor = getStatusColor(status);
    const userFirstName = safe((order.user?.name || 'Customer').split(' ')[0]);

    const htmlContent = renderShell({
        eyebrow: `Order Update: ${status}`,
        title: `Greetings, ${userFirstName}`,
        message: safe(statusMessage),
        accentColor: statusColor,
        body: `
            ${renderOrderSummaryCard(order)}
            <div style="margin-bottom: 40px;">
                ${isPickupOrder(order) ? `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="width: 50%; valign: top; padding-right: 10px;">
                            <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Shipping Destination</span>
                            <p style="font-size: 13px; color: #4b5563; margin: 0; line-height: 1.5;">
                                ${safe(order.shippingAddress?.address || '')}<br />
                                ${safe(order.shippingAddress?.city || '')}, ${safe(order.shippingAddress?.postalCode || '')}<br />
                                Phone: ${safe(order.shippingAddress?.phone || '')}
                            </p>
                        </td>
                        <td style="width: 50%; valign: top; padding-left: 10px; border-left: 1px solid #e5e7eb;">
                            <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Pickup Origin (Store)</span>
                            <p style="font-size: 13px; color: #4b5563; margin: 0; line-height: 1.5;">
                                ${safe(INVOICE_ACCOUNT_DETAILS.fromName)}<br />
                                ${safe(INVOICE_ACCOUNT_DETAILS.fromAddress1)}<br />
                                ${safe(INVOICE_ACCOUNT_DETAILS.fromAddress2)}<br />
                                Phone: ${safe(INVOICE_ACCOUNT_DETAILS.fromPhone)}
                            </p>
                        </td>
                    </tr>
                </table>
                ` : `
                <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Shipping To</span>
                <p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.5;">
                    ${safe(order.shippingAddress?.address || '')}<br />${safe(order.shippingAddress?.city || '')}, ${safe(order.shippingAddress?.postalCode || '')}<br />${safe(order.shippingAddress?.country || '')}
                </p>
                `}
            </div>
        `,
        ctaLabel: 'View Your Order',
        ctaUrl: ACCOUNT_URL,
    });

    const mailOptions = {
        from: `"${BRAND_TITLE}" <info@srivinayakacollections.com>`,
        to: order.user.email,
        subject: `Update: Your Order is now ${status}`,
        html: htmlContent,
    };

    try {
        if (status === 'Delivered') {
            const pdfBuffer = await buildInvoicePdfBuffer(order);
            mailOptions.attachments = [
                {
                    filename: `invoice-${order._id.toString().slice(-8).toUpperCase()}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ];
        }

        await transporter.sendMail(mailOptions);
        console.log(`Email sent for order ${order._id}: ${status}`);
    } catch (error) {
        console.error('Email sending failed:', error);
    }
};

export const sendWelcomeEmail = async (user) => {
    if (!user?.email) return;

    const userFirstName = safe((user.name || 'Customer').split(' ')[0]);
    const htmlContent = renderShell({
        title: `Welcome, ${userFirstName}`,
        message: 'Thank you for joining Sri Vinayaka Collections. We are delighted to help you discover elegant pieces for every occasion.',
        body: `
            <div style="background-color: #faf9f6; padding: 32px; border-radius: 20px; border: 1px solid #f3f4f6; margin-bottom: 32px;">
                <h3 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #0c0a09; margin: 0 0 16px 0;">What you can expect</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                    <li>New arrivals and bestselling collections.</li>
                    <li>Seamless order updates and delivery tracking.</li>
                    <li>Easy browsing across sarees, dresses, and curated picks.</li>
                </ul>
            </div>
        `,
        ctaLabel: 'Explore the Collection',
        ctaUrl: BRAND_WEBSITE,
    });

    try {
        await transporter.sendMail({
            from: `"${BRAND_TITLE}" <info@srivinayakacollections.com>`,
            to: user.email,
            subject: `Welcome to ${BRAND_TITLE}`,
            html: htmlContent,
        });
        console.log(`Welcome email sent to: ${user.email}`);
    } catch (error) {
        console.error('Welcome email failed:', error);
    }
};

export const sendNewOrderNotification = async (order) => {
    if (!order.user?.email) return;

    const userFirstName = safe((order.user?.name || 'Customer').split(' ')[0]);

    const customerHtml = renderShell({
        eyebrow: `Order Received: #${safe(order._id.toString().slice(-8).toUpperCase())}`,
        title: `Greetings, ${userFirstName}`,
        message: 'We have received your order and our team is preparing it for processing.',
        body: renderOrderSummaryCard(order),
        ctaLabel: 'Track Your Order',
        ctaUrl: ACCOUNT_URL,
    });

    const adminHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; padding: 40px; background-color: #f3f4f6; color: #1f2937;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="margin-top: 0; color: #374151;">New Order Alert</h2>
            <p>You have a new order from <strong>${safe(order.user?.name || '')}</strong>.</p>
            <p style="font-size: 13px; margin: 6px 0;">Email: ${safe(order.user?.email || '')}</p>
            <p style="font-size: 13px; margin: 6px 0;">Phone: ${safe(order.shippingAddress?.phone || 'N/A')}</p>
            <p style="font-size: 13px; margin: 16px 0 6px 0;"><strong>Shipping Address</strong></p>
            <p style="font-size: 13px; margin: 4px 0;">${safe(order.shippingAddress?.address || '')}</p>
            <p style="font-size: 13px; margin: 4px 0;">${safe(order.shippingAddress?.city || '')}, ${safe(order.shippingAddress?.postalCode || '')}</p>
            <h3 style="margin-top: 24px; color: #b45309;">Total: ${formatCurrency(order.totalPrice)}</h3>
            <a href="${ADMIN_ORDERS_URL}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; margin-top: 16px;">Manage Order in Admin</a>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"${BRAND_TITLE}" <info@srivinayakacollections.com>`,
            to: order.user.email,
            subject: `Order Placed: ${BRAND_TITLE}`,
            html: customerHtml,
        });

        await transporter.sendMail({
            from: '"Order Notifier" <info@srivinayakacollections.com>',
            to: ADMIN_NOTIFICATION_EMAIL,
            subject: `New Order Received (#${order._id.toString().slice(-8).toUpperCase()})`,
            html: adminHtml,
        });

        console.log(`Order notification emails sent for order ${order._id}`);
    } catch (error) {
        console.error('Order notification failed:', error);
    }
};
