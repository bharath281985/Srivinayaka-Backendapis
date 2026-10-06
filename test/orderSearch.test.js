import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';

test('order search filter does not throw CastError on phone numbers or text search', async () => {
    const search = '9392239145';
    const cleanSearch = search.trim();
    const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const q = new RegExp(escapeRegex(cleanSearch), 'i');
    const digitSearch = cleanSearch.replace(/\D/g, '');

    const userConditions = [
        { name: q },
        { email: q },
        { phone: q }
    ];
    if (digitSearch.length >= 3) {
        userConditions.push({ phone: new RegExp(escapeRegex(digitSearch), 'i') });
    }

    const searchOr = [
        { orderStatus: q },
        { shippingMethod: q },
        { 'shippingAddress.phone': q },
        { 'shippingAddress.city': q },
        { 'shippingAddress.address': q },
    ];

    if (digitSearch.length >= 3) {
        searchOr.push({ 'shippingAddress.phone': new RegExp(escapeRegex(digitSearch), 'i') });
    }

    if (mongoose.isValidObjectId(cleanSearch)) {
        searchOr.push({ _id: new mongoose.Types.ObjectId(cleanSearch) });
    } else {
        searchOr.push({
            $expr: {
                $regexMatch: {
                    input: { $toString: '$_id' },
                    regex: escapeRegex(cleanSearch),
                    options: 'i',
                },
            },
        });
    }

    const filter = {
        $or: [{ isPaid: true }, { paymentMethod: { $ne: 'Online' } }],
        $and: [{ $or: searchOr }],
    };

    assert.doesNotThrow(() => {
        Order.find(filter).cast(Order);
    });
});
