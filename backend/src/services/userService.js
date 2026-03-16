const User = require("../models/User");
const bcrypt = require("bcrypt");

exports.updateProfile = async (req, res, next) => {
    try {
        const dataToUpdate = {};
        if (req.body.username) {
            dataToUpdate.username = req.body.username;
        }

        if (req.file) {
            const imageUrl = await uploadToCloudinary(req.file, "profile");
            dataToUpdate.profilePicture = imageUrl;
        }

        const updatedUser = await userService.updateProfile(req.user.id, dataToUpdate);

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    } catch (err) {
        next(err);
    }
};