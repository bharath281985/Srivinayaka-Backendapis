import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import axios from 'axios';
import { getAuth, isFirebaseConfigured } from '../config/firebaseAdmin.js';
import { sendWelcomeEmail } from '../utils/emailService.js';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const STATIC_OTP_BY_PHONE = new Map([
    ['918309470360', '123456'],
    ['919441457677', '123456'],
]);

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getIstDayRange = (date = new Date()) => {
    const offsetMinutes = 330;
    const offsetMs = offsetMinutes * 60 * 1000;
    const istNow = new Date(date.getTime() + offsetMs);
    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const day = istNow.getUTCDate();

    const startUtc = new Date(Date.UTC(year, month, day, 0, 0, 0) - offsetMs);
    const endUtc = new Date(Date.UTC(year, month, day + 1, 0, 0, 0) - offsetMs);

    return { startUtc, endUtc };
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Send OTP to phone (mobile app; stores OTP server-side for verify-otp)
// @route   POST /api/users/send-otp
// @access  Public
const sendOtp = async (req, res) => {
    const { phone } = req.body;
    // Take only 10 numbers from input, then add 91
    const normalized = (String(phone || '').replace(/\D/g, '').slice(-10));
    const fullPhone = normalized.length === 10 ? '91' + normalized : null;

    if (!fullPhone) {
        return res.status(400).json({ message: 'Valid 10-digit phone number is required' });
    }

    const otp = STATIC_OTP_BY_PHONE.get(fullPhone) || generateOtp();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    try {
        let user = await User.findOne({ phone: fullPhone });

        if (user) {
            user.otp = otp;
            user.otpExpires = expiresAt;
            await user.save();
        } else {
            // Create a new user with just the phone and OTP
            user = await User.create({
                phone: fullPhone,
                name: 'User ' + fullPhone.slice(-4),
                otp,
                otpExpires: expiresAt
            });
        }

        const payload = {
            senderId: "DCATCH",
            dcs: 0,
            flashSms: 0,
            peId: "1701176941646257005",
            text: `${otp} is your OTP for verifying your DAY CATCH Account. Please do not share it with anyone.`,
            dltTemplateId: "1707176943132258803",
            chainValue: "1701176941646257005,1702160915855670817",
            messageId: Math.random().toString(36).substring(7),
            numbers: [fullPhone]
        };

        await axios.post('https://alots.io/api/v1/sms/mt', payload, {
            headers: {
                'authorization': 'Bearer 61acea92-6360-447e-a5b4-93cf05897991',
                'content-type': 'application/json'
            }
        });

        console.log(`[send-otp] OTP (${otp}) sent and saved to DB for ${fullPhone}`);
        res.status(200).json({ message: 'OTP sent' });
    } catch (error) {
        console.error('Alots SMS API or DB error:', error.response?.data || error.message || error);
        
        // If it's a duplicate email-null error, try to fix the index automatically
        if (error.code === 11000 && error.message.includes('email_1')) {
            try {
                console.log('Detected faulty email index. Attempting to drop and rebuild...');
                await User.collection.dropIndex('email_1');
                // Re-calling the function once or just notifying the user
                return res.status(500).json({ 
                    message: 'Database index refreshed. Please try again in a moment.' 
                });
            } catch (dropError) {
                console.error('Failed to drop index:', dropError.message);
            }
        }

        res.status(500).json({ 
            message: 'Failed to send OTP', 
            error: error.message 
        });
    }
};

// @desc    Verify OTP and login (mobile app)
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { phone, otp } = req.body;
    // Take only 10 numbers from input, then add 91
    const normalized = (String(phone || '').replace(/\D/g, '').slice(-10));
    const fullPhone = normalized.length === 10 ? '91' + normalized : null;

    if (!fullPhone || !otp) {
        return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    let user = await User.findOne({ phone: fullPhone });

    if (!user || !user.otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ message: 'OTP expired or invalid. Please request a new code.' });
    }

    if (user.otp !== String(otp).trim()) {
        return res.status(401).json({ message: 'The code you entered is invalid. Please try again.' });
    }

    // Clear OTP fields after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const isNewUser = !user.email && (!user.name || user.name.startsWith('User ')) && (Date.now() - new Date(user.createdAt).getTime() < 15 * 60 * 1000);

    res.json({
        _id: user._id,
        name: user.name,
        phone: user.phone,
        isAdmin: user.isAdmin,
        profileImage: user.profileImage,
        gender: user.gender,
        age: user.age,
        isNewUser,
        token: generateToken(user._id),
    });
};

// @desc    Sign in with Firebase Phone Auth (client sends Firebase ID token after verifying OTP)
// @route   POST /api/users/firebase-phone-auth
// @access  Public
const firebasePhoneAuth = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ message: 'Firebase ID token is required' });
    }

    if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: 'Firebase Auth is not configured on the server' });
    }

    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const phone = (decodedToken.phone_number || '').replace(/\D/g, '');
        if (!phone) {
            return res.status(400).json({ message: 'Phone number not found in token' });
        }
        const normalizedPhone = phone.startsWith('91') ? phone : '91' + phone;

        let user = await User.findOne({ phone: normalizedPhone });
        if (!user) {
            user = await User.create({
                phone: normalizedPhone,
                name: 'User ' + normalizedPhone.slice(-4),
            });
        }

        const isNewUser = !user.email && (!user.name || user.name.startsWith('User ')) && (Date.now() - new Date(user.createdAt).getTime() < 15 * 60 * 1000);

        res.json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            isAdmin: user.isAdmin,
            profileImage: user.profileImage,
            gender: user.gender,
            age: user.age,
            isNewUser,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Firebase auth error:', error.message);
        res.status(401).json({ message: 'Invalid or expired Firebase token' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });
        sendWelcomeEmail(user);
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            gender: user.gender,
            age: user.age,
            isAdmin: user.isAdmin,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const { startUtc, endUtc } = getIstDayRange();

        const filter = {};
        if (search) {
            const q = new RegExp(escapeRegex(search), 'i');
            filter.$or = [
                { name: q },
                { email: q },
                { phone: q },
            ];
        }

        const [totalUsers, todayUsers, filteredTotal, users] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $gte: startUtc, $lt: endUtc } }),
            search ? User.countDocuments(filter) : Promise.resolve(0),
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);
        const total = search ? filteredTotal : totalUsers;

        if (req.query.page || req.query.limit) {
            res.json({
                users,
                page,
                pages: Math.max(1, Math.ceil(total / limit)),
                limit,
                total,
                totalUsers,
                todayUsers,
            });
        } else {
            res.json(users);
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to load users' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        try {
            const isFirstEmail = !user.email && req.body.email;
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;
            if (req.body.gender !== undefined) user.gender = req.body.gender;
            if (req.body.age !== undefined) user.age = req.body.age;
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();
            if (isFirstEmail) {
                sendWelcomeEmail(updatedUser);
            }

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                profileImage: updatedUser.profileImage,
                gender: updatedUser.gender,
                age: updatedUser.age,
                isAdmin: updatedUser.isAdmin,
                token: generateToken(updatedUser._id),
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ message: 'This email is already linked to another account.' });
            }
            throw error; // Re-throw if it's not a duplicate key error
        }
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
const deleteUser = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        await user.deleteOne();
        res.json({ message: 'User account deleted successfully' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Add new address
// @route   POST /api/users/addresses
// @access  Private
const addAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            const { name, phone, addressLine, city, state, zipCode, isDefault, label } = req.body;
            
            if (isDefault) {
                user.addresses.forEach(addr => addr.isDefault = false);
            }

            user.addresses.push({ name, phone, addressLine, city, state, zipCode, isDefault, label });
            await user.save();
            res.status(201).json(user.addresses);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update address
// @route   PUT /api/users/addresses/:id
// @access  Private
const updateAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            const address = user.addresses.id(req.params.id);
            if (address) {
                if (req.body.isDefault) {
                    user.addresses.forEach(addr => addr.isDefault = false);
                }
                Object.assign(address, req.body);
                await user.save();
                res.json(user.addresses);
            } else {
                res.status(404).json({ message: 'Address not found' });
            }
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
const deleteAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.addresses = user.addresses.filter(addr => addr._id.toString() !== req.params.id);
            await user.save();
            res.json(user.addresses);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
const getUserAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json(user.addresses);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register push token
// @route   POST /api/users/push-token
// @access  Private
const savePushToken = async (req, res) => {
    const { token, deviceType } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
        user.pushToken = token || '';
        user.deviceType = deviceType || '';
        await user.save();
        res.json({ message: 'Push token saved successfully' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

export { 
    authUser, 
    registerUser, 
    getUserProfile, 
    updateUserProfile, 
    getUsers, 
    firebasePhoneAuth, 
    sendOtp,
    verifyOtp,
    deleteUser,
    addAddress,
    updateAddress,
    deleteAddress,
    getUserAddresses,
    savePushToken
};
