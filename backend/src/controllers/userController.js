const User = require("../models/User");
const bcrypt = require("bcrypt");
const { uploadToCloudinary } = require("../utils/cloudinaryUploader"); 

exports.updateProfile = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id, { name: req.body.name }, { new: true }).select("-password");
        res.status(200).json({ success: true, data: user });
    } catch (err) { next(err); }
};

exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

        const imageUrl = await uploadToCloudinary(req.file, "promanage_avatars");

        const user = await User.findByIdAndUpdate(req.user._id, { profilePic: imageUrl }, { new: true }).select("-password");
        res.status(200).json({ success: true, data: user });
    } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Current password incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.status(200).json({ success: true, message: "Password updated" });
    } catch (err) { next(err); }
};

exports.setPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        const user = await User.findById(req.user._id);

        user.password = await bcrypt.hash(password, 10);
        user.hasPassword = true;
        await user.save();
        res.status(200).json({ success: true, message: "Password set successfully" });
    } catch (err) { next(err); }
};