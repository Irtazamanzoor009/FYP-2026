const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { secret, expiresIn } = require("../config/jwt");
const sendEmail = require("../utils/email");
const axios = require('axios');

exports.login = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw { statusCode: 400, message: "Invalid email or user is deleted" };
    }

    if (user.authProvider === 'google' && !user.hasPassword) {
        throw {
            statusCode: 400,
            message: "This account was created using Google. Please sign in with Google."
        };
    }

    if (user.otpCode && user.otpExpires && user.otpExpires > Date.now() || (user.isEmailVerified == false)) {
        throw {
            statusCode: 401,
            message: "Account verification pending. Please verify your OTP first or request a new oneeeeee.",
            requiresOTP: true,
            userId: user._id
        };
    }

    if (user.otpCode && user.otpExpires && user.otpExpires <= Date.now()) {
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw { statusCode: 400, message: "Invalid password" };
    }

    const token = jwt.sign({ id: user._id, email: user.email }, secret, {
        expiresIn,
    });

    user.password = undefined;

    return { token, user };
};

exports.verifyTokenAndGetUser = async (token) => {
    if (!token) {
        throw { statusCode: 401, message: "No token provided" };
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        throw { statusCode: 401, message: "Invalid or expired token" };
    }

    const user = await User.findOne({
        _id: decoded.id,
    });

    if (!user) {
        throw { statusCode: 401, message: "User not found" };
    }

    return user;
};

exports.signup = async (userData) => {
    const { name, email, password } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        if (existingUser.otpCode && existingUser.otpExpires && existingUser.otpExpires > Date.now()) {
            await User.findByIdAndDelete(existingUser._id);
        } else {
            throw { statusCode: 400, message: "Email already exists." };
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        name,
        email,
        password: hashedPassword,
        hasPassword: true,
    });

    const otpCode = user.createOTPCode();

    // Send OTP email
    try {
        await sendEmail({
            email: user.email,
            subject: "Account Verification - ProManage Bot",
            message: `Welcome to ProManage Bot! Your verification code is: ${otpCode}. It expires in 5 minutes.`,
            template: "signup-verification",
            variables: { otpCode },
        });

        await user.save();
    } catch (err) {
        throw { statusCode: 500, message: "Error sending verification email. Please try again." };
    }

    return { message: "Account created! OTP sent to your email. Please verify to complete signup.", userId: user._id };
};

exports.googleSignup = async (body) => {
    const { code } = body;

    if (!code) {
        throw { statusCode: 400, message: "Google authorization code is missing." };
    }

    let email, name;

    try {
        // STEP 1: Exchange the 'code' for an 'access_token'
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code: code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${process.env.FRONTEND_URL}/google-callback`,
            grant_type: 'authorization_code',
        });

        const { access_token } = tokenResponse.data;

        // STEP 2: Use the 'access_token' to get the User's Profile (Email/Name)
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        email = userResponse.data.email;
        name = userResponse.data.name;

    } catch (err) {
        console.error("Google Exchange Error:", err.response?.data || err.message);
        throw { statusCode: 401, message: "Failed to authenticate with Google." };
    }


    let user = await User.findOne({ email });

    if (user && user.authProvider !== "google") {
        if (user.otpCode && user.otpExpires && user.otpExpires > Date.now()) {
            await User.findByIdAndDelete(user._id);
            user = null;
        } else {
            throw {
                statusCode: 400,
                message:
                    "This email is already registered with a password. Please log in using your password.",
            };
        }
    }

    if (!user) {
        user = await User.create({
            name: name || email.split("@")[0],
            email,
            authProvider: "google",
            isEmailVerified: true,
        });
    }

    const appToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return { appToken, user };
};

exports.setPassword = async (userId, password) => {
    const user = await User.findById(userId);
    if (!user) throw { statusCode: 404, message: "User not found" };
    user.password = await bcrypt.hash(password, 10);
    user.hasPassword = true;
    await user.save();
    user.password = undefined;
    return user;
};

exports.resetPassword = async (userId, oldPassword, newPassword) => {
    const user = await User.findById(userId);
    if (!user) throw { statusCode: 404, message: "User not found" };
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw { statusCode: 400, message: "Old password is incorrect" };
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
};

exports.forgotPassword = async (email) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw {
            message: "No account found with this email.",
            statusCode: 404,
        };
    }
    if (user.authProvider == "google") {
        throw {
            message: "Your account is linked with Google. Please log in using Google Sign-In.",
            statusCode: 400,
        };
    }

    const resetToken = await user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
        const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const message = `Forgot your password? Click this link to reset it: ${resetURL}\nThis link is valid for 10 minutes.`;

        await sendEmail({
            email: user.email,
            subject: "Your Password Reset Link",
            message,
            template: "reset-password",
            variables: { resetURL },
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        throw {
            message: "There was an error sending the email. Please try again later.",
            statusCode: 500,
        };
    }
};

exports.nonAuthResetPassword = async (token, newPassword) => {
    const usersWithValidTokens = await User.find({
        passwordResetExpires: { $gt: Date.now() },
    });

    let user = null;
    for (const potentialUser of usersWithValidTokens) {
        if (!potentialUser.passwordResetToken) continue;
        const isValidToken = await bcrypt.compare(
            token,
            potentialUser.passwordResetToken
        );
        if (isValidToken) {
            user = potentialUser;
            break;
        }
    }

    if (!user) {
        throw { message: "Token is invalid or has expired.", statusCode: 400 };
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
};

exports.verifyOTP = async (userId, otpCode) => {
    const user = await User.findById(userId);

    if (!user) {
        throw { statusCode: 404, message: "User not found" };
    }

    if (!user.otpCode || !user.otpExpires) {
        throw { statusCode: 400, message: "No OTP found. Please request a new one." };
    }

    if (Date.now() > user.otpExpires) {
        // Clear expired OTP
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw { statusCode: 400, message: "OTP has expired. Please request a new one." };
    }

    if (user.otpCode !== otpCode) {
        throw { statusCode: 400, message: "Invalid OTP code." };
    }

    // Clear OTP after successful verification
    user.isEmailVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, secret, {
        expiresIn,
    });

    user.password = undefined;

    return { token, user };
};

exports.resendOTP = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw { statusCode: 404, message: "User not found" };
    }

    // Generate new OTP
    const otpCode = user.createOTPCode();
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    try {
        await sendEmail({
            email: user.email,
            subject: "Verification Code - Pro Manage Bot",
            message: `Your new verification code is: ${otpCode}. This code will expire in 5 minutes.`,
            template: "login-otp",
            variables: { otpCode },
        });
    } catch (err) {
        // Clear OTP if email fails
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        throw { statusCode: 500, message: "Error sending verification email. Please try again." };
    }

    return { message: "New OTP sent to your email." };
};

exports.saveJiraCredentials = async (userId, jiraDomain, jiraEmail, jiraApiToken) => {
    const user = await User.findByIdAndUpdate(
        userId,
        { jiraDomain, jiraEmail, jiraApiToken },
        { new: true }
    ).select('-password');

    if (!user) {
        throw { statusCode: 404, message: 'User not found' };
    }

    // Auto-initialize workspace after credentials saved
    try {
        const jiraService = require('./jiraService');
        await jiraService.initializeWorkspace(userId);
    } catch (err) {
        // Don't fail the whole request if workspace init fails
        // User can manually trigger init later
        console.warn('⚠️ Workspace auto-init failed:', err.message);
    }

    return user;
};;
