import Product from '../models/productModel.js';

const findOrderVariant = (product, orderVariant) => {
    if (!product?.variants?.length || !orderVariant) return null;

    const variantId = orderVariant._id?.toString?.() || orderVariant.id?.toString?.();
    if (variantId) {
        const byId = product.variants.id(variantId);
        if (byId) return byId;
    }

    const sku = String(orderVariant.sku || '').trim();
    const color = String(orderVariant.color || '').trim();
    const size = String(orderVariant.size || '').trim();

    return product.variants.find((variant) => {
        if (sku && variant.sku === sku) return true;
        if (color && size) return variant.color === color && variant.size === size;
        return false;
    }) || null;
};

const decrementInventoryForOrder = async (order) => {
    if (!order?.orderItems?.length) return order;
    if (order.stockAdjusted) return order;

    const productIds = [...new Set(
        order.orderItems
            .map((item) => item.product?.toString?.())
            .filter(Boolean)
    )];

    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const touched = new Set();

    for (const item of order.orderItems) {
        const qty = Number(item.qty || 0);
        if (qty <= 0) continue;

        const productId = item.product?.toString?.();
        const product = productMap.get(productId);
        if (!product) {
            throw new Error(`Product not found for order item: ${item.name || productId || 'unknown'}`);
        }

        const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
        const variant = findOrderVariant(product, item.variant);

        if (hasVariants) {
            if (!variant) {
                throw new Error(`Variant not found for product: ${product.name}`);
            }

            const current = Number(variant.countInStock || 0);
            if (current < qty) {
                throw new Error(`Insufficient stock for ${product.name} (${variant.size || variant.sku || 'variant'})`);
            }

            variant.countInStock = current - qty;
        } else {
            const current = Number(product.countInStock || 0);
            if (current < qty) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }

            product.countInStock = current - qty;
        }

        touched.add(productId);
    }

    for (const productId of touched) {
        const product = productMap.get(productId);
        if (!product) continue;

        if (Array.isArray(product.variants) && product.variants.length > 0) {
            product.countInStock = product.variants.reduce((sum, variant) => sum + (Number(variant.countInStock) || 0), 0);
        }

        await product.save();
    }

    order.stockAdjusted = true;
    order.stockAdjustedAt = new Date();
    await order.save();
    return order;
};

export { decrementInventoryForOrder };
