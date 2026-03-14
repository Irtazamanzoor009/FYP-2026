const authService = require("../services/authService");

exports.login = async (req, res, next) => {
  try {
   
    const { email, password } = req.body;
    const { token, user } = await authService.login(email, password);
    res.cookie("pro_manage_bot_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: user,
    });
  } catch (err) {
    // Handle OTP verification required error
    if (err.requiresOTP) {
      return res.status(400).json({
        success: false,
        message: err.message,
        requiresOTP: true,
        userId: err.userId,
      });
    }
    next(err);
  }
};

exports.checkAuth = async (req, res, next) => {
  try {
    const token = req.cookies.pro_manage_bot_token;

    const user = await authService.verifyTokenAndGetUser(token);

    res.status(200).json({
      success: true,
      message: "User is authenticated",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.clearCookie("pro_manage_bot_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    next(err);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.signup({ name, email, password });

    res.status(201).json({
      success: true,
      message: result.message,
      userId: result.userId,
    });
  } catch (err) {
    next(err);
  }
};

exports.googleSignup = async (req, res, next) => {
    try {
        const { appToken, user } = await authService.googleSignup(req.body);
        res.cookie("pro_manage_bot_token", appToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });
        res.status(200).json({
            success: true,
            message: "Google signup/login successful",
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

exports.setPassword = async (req, res, next) => {
  try {

    const { password } = req.body;
    const userId = req.user._id || req.user.id;
    const user = await authService.setPassword(userId, password);
    res.status(200).json({
      success: true,
      message: "Password set successfully.",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
  
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id || req.user.id;
    const user = await authService.resetPassword(
      userId,
      oldPassword,
      newPassword
    );
    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

exports.nonAuthResetPassword = async (req, res, next) => {
  try {

    const { token } = req.params;
    const { password } = req.body;

    await authService.nonAuthResetPassword(token, password);

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    console.log("Req.body: ", req.body);
    const { userId, otpCode } = req.body;
    console.log("User ID: ", userId);
    console.log("OTP: ", otpCode);
    const { token, user } = await authService.verifyOTP(userId, otpCode);

    res.cookie("pro_manage_bot_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. Login complete.",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const result = await authService.resendOTP(userId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

exports.saveJiraCredentials = async (req, res, next) => {
  try {
    const { jiraDomain, jiraEmail, jiraApiToken } = req.body;
    const userId = req.user._id;

    const user = await authService.saveJiraCredentials(userId, jiraDomain, jiraEmail, jiraApiToken);

    res.status(200).json({
      success: true,
      message: "Jira connected successfully!",
      data: user
    });
  } catch (err) {
    next(err);
  }
};
