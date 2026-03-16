const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: false, // bcrypt hashed
            default: null,
        },
        authProvider: {
            type: String,
            required: true,
            enum: ["local", "google"],
            default: "local",
        },
        hasPassword: {
            type: Boolean,
            default: false,
        },
        jiraDomain: {
            type: String,
            default: null,
        },
        jiraEmail: {
            type: String,
            default: null,
        },
        jiraApiToken: {
            type: String,
            default: null,
        },
        profilePic: {
            type: String,
            default: null,
        },
        passwordResetToken: String,
        passwordResetExpires: Date,
        otpCode: String,
        otpExpires: Date,
        isEmailVerified: {
            type: Boolean,
            default: false,
        },

    },
    { timestamps: true }
);

userSchema.methods.createPasswordResetToken = async function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = await bcrypt.hash(resetToken, 10);

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

userSchema.methods.createOTPCode = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    this.otpCode = otp;
    this.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    return otp;
};

module.exports = mongoose.model("User", userSchema);
