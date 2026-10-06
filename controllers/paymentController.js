import crypto from 'crypto';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { sendOrderStatusEmail, sendNewOrderNotification } from '../utils/emailService.js';
import { decrementInventoryForOrder } from '../utils/orderInventory.js';

import Setting from '../models/settingModel.js';

const getEasebuzzConfig = async () => {
    const config = await Setting.findOne({ key: 'easebuzz_config' });
    if (!config?.value) {
        console.warn('⚠️  [Easebuzz] Config NOT found in DB — using hardcoded test fallback. Go to Admin → Payment Settings to configure production keys.');
    }
    return config?.value || {
        key: '2PBP7IABZ2',
        salt: 'DAH88E3UWQ',
        env: 'test'
    };
};

async function generateHash(data) {
    const config = await getEasebuzzConfig();
    const firstname = data.firstname || 'Customer';
    const email = data.email || 'customer@srivinayakacollections.com';
    const hashstring = `${config.key}|${data.txnid}|${data.amount}|${data.productinfo}|${firstname}|${email}|||||||||||${config.salt}`;
    return crypto.createHash('sha512').update(hashstring).digest('hex');
}

export const initiatePayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId).populate('user');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const config = await getEasebuzzConfig();
        // Easebuzz requires txnid ≤ 25 chars. Use base-36 timestamp + last 4 chars of orderId.
        const txnid = `E${Date.now().toString(36).toUpperCase()}${orderId.toString().slice(-4).toUpperCase()}`;
        
        const backendUrl = process.env.BASE_URL || 'https://backendapis.srivinayakacollections.com';
        const data = {
            key: config.key,
            txnid: txnid,
            amount: order.totalPrice.toFixed(2),
            productinfo: 'Saree Order',
            firstname: (order.user?.name || order.shippingAddress.name || 'Customer').split(' ')[0], // Best to use only first word
            phone: order.shippingAddress.phone || order.user?.phone || '9999999999',
            email: order.user?.email || 'customer@srivinayakacollections.com',
            surl: `${backendUrl}/api/orders/easebuzz/callback`,
            furl: `${backendUrl}/api/orders/easebuzz/callback`,
        };

        const hash = await generateHash(data);
        data.hash = hash;

        // Optionally, save the txnid to the order for tracking
        order.paymentResult = { id: txnid, status: 'initiated' };
        await order.save();

        const url = config.env === 'test' ? 'https://testpay.easebuzz.in/payment/initiateLink' : 'https://pay.easebuzz.in/payment/initiateLink';
        
        const params = new URLSearchParams(data);

        const response = await axios.post(url, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data.status === 1) {
            res.json({
                success: true,
                access_key: response.data.data,
                url: config.env === 'test' ? `https://testpay.easebuzz.in/pay/${response.data.data}` : `https://pay.easebuzz.in/pay/${response.data.data}`
            });
        } else {
            res.status(400).json({ success: false, message: response.data.data });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Payment initiation failed' });
    }
};

export const paymentCallback = async (req, res) => {
    try {
        console.log('PAYMENT CALLBACK RECEIVED:', req.body);
        if (!req.body || Object.keys(req.body).length === 0) {
            console.error('PAYMENT CALLBACK ERROR: No body received');
            return res.status(400).json({ message: 'Invalid request: No payment data received' });
        }
        const { status, txnid, hash, amount, productinfo, firstname, email, error_Message } = req.body;
        
        const config = await getEasebuzzConfig();

        // Reverse hash verification
        const responseHashSequence = `${config.salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${config.key}`;
        const generatedHash = crypto.createHash('sha512').update(responseHashSequence).digest('hex');

        if (generatedHash !== hash) {
            console.error('PAYMENT CALLBACK ERROR: Hash mismatch. Expected:', generatedHash, 'Received:', hash);
            return res.status(400).json({ message: 'Hash mismatch, invalid payment' });
        }

        // Find order by txnid in paymentResult
        const order = await Order.findOne({ 'paymentResult.id': txnid });

        if (!order) {
            console.error('PAYMENT CALLBACK ERROR: Order not found for txnid:', txnid);
            return res.status(404).json({ message: 'Order not found' });
        }

        console.log(`PAYMENT CALLBACK: Updating Order ${order._id} to status: ${status}`);

        if (status === 'success') {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = {
                id: txnid,
                status: status,
                update_time: Date.now().toString(),
                email_address: email,
                status_message: error_Message || 'Payment Successful'
            };

            // Attempt inventory decrement but don't block order success if it fails
            try {
                await decrementInventoryForOrder(order);
            } catch (inventoryError) {
                console.error(`PAYMENT CALLBACK: Inventory adjustment failed for order ${order._id}:`, inventoryError.message);
            }

            await order.save();
            console.log(`PAYMENT CALLBACK SUCCESS: Order ${order._id} updated to PAID`);

            // Attempt to send notifications
            try {
                await order.populate('user', 'name email');
                sendOrderStatusEmail(order);
                sendNewOrderNotification(order);
            } catch (notifyError) {
                console.error(`PAYMENT CALLBACK: Notification failed for order ${order._id}:`, notifyError.message);
            }
        } else {
            console.log(`PAYMENT CALLBACK NON-SUCCESS: Status received: ${status} for Txn: ${txnid}`);
            order.paymentResult = {
                id: txnid || order.paymentResult?.id,
                status: status,
                update_time: Date.now().toString(),
                email_address: email || order.paymentResult?.email_address,
                status_message: error_Message || 'Payment Failed or Cancelled'
            };
            await order.save();
        }

        // Redirect to success or failure page
        const frontendUrl = process.env.FRONTEND_URL || 'https://srivinayakacollections.com';
        if (status === 'success') {
            res.redirect(`${frontendUrl}/payment/success?orderId=${order._id}`);
        } else {
            res.redirect(`${frontendUrl}/payment/failure?orderId=${order._id}`);
        }
    } catch (error) {
        // Always redirect on crash — never return JSON. Easebuzz expects a redirect response.
        console.error('[Easebuzz] CRITICAL CALLBACK ERROR:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'https://srivinayakacollections.com';
        return res.redirect(`${frontendUrl}/payment/failure`);
    }
};
