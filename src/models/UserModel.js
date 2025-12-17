const mongoose = require("mongoose")
const userSchema = new mongoose.Schema(
    {
        name: { type: String },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        isAdmin: { type: Boolean, default: false, required: true },
        // Store phone as string so it can start with 0
        phone: { type: String },
        // Support multiple shipping addresses
        addresses: [
            {
                name: { type: String },
                phone: { type: String },
                address: { type: String },
                city: { type: String },
                isDefault: { type: Boolean, default: false }
            }
        ],
        // Keep single address field for backward compatibility
        address: { type: String },
        avatar: { type: String },
        city: { type: String },
        otp: { type: String }, // Thêm trường OTP
        otpExpires: { type: Date } //
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);
module.exports = User;