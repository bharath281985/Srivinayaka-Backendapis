import express from 'express';
const router = express.Router();
import {
    authUser,
    registerUser,
    getUserProfile,
    getUsers,
    firebasePhoneAuth,
    sendOtp,
    verifyOtp,
    updateUserProfile,
    deleteUser,
    addAddress,
    updateAddress,
    deleteAddress,
    getUserAddresses,
    savePushToken
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', authUser);
router.post('/firebase-phone-auth', firebasePhoneAuth);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile).delete(protect, deleteUser);

router.post('/push-token', protect, savePushToken);

router.route('/addresses').get(protect, getUserAddresses).post(protect, addAddress);
router.route('/addresses/:id').put(protect, updateAddress).delete(protect, deleteAddress);

export default router;
