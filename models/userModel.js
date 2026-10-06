import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: false, // Can be updated after OTP verify
        },
        email: {
            type: String,
            required: false,
            unique: true,
            sparse: true // Allows multiple null emails
        },
        password: {
            type: String,
            required: false, // Not needed for OTP flow
        },
        profileImage: {
            type: String,
            default: '',
        },
        gender: {
            type: String,
            default: '',
        },
        age: {
            type: Number,
        },
        phone: {
            type: String,
            required: false,
            unique: true,
            sparse: true
        },
        otp: {
            type: String
        },
        otpExpires: {
            type: Date
        },
        isAdmin: {
            type: Boolean,
            required: true,
            default: false,
        },
        addresses: [
            {
                name: { type: String },
                phone: { type: String },
                addressLine: { type: String },
                city: { type: String },
                state: { type: String },
                zipCode: { type: String },
                isDefault: { type: Boolean, default: false },
                label: { type: String, default: 'Home' },
            }
        ],
        pushToken: {
            type: String,
            default: '',
        },
        deviceType: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

export default User;
