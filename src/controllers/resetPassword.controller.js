import { User } from "../models/user.model.js";
import { generateResetTokenAndSendEmail, verifyResetTokenAndUpdatePassword } from '../services/resetPassword.service.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    return next(ApiError(404, "User not found"));
  }
  try {
    const resetToken = await generateResetTokenAndSendEmail(user.email);
    user.resetPasswordToken = resetToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset token sent to email",
    });
  } catch (error) {
    console.error("Error sending reset password email:", error);
    return next(ApiError(500, "Error sending reset password email"));
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, newPassword } = req.body;

  // Find user by reset token
  const user = await User.findOne({ resetPasswordToken: token });

  if (!user) {
    return next(ApiError(400, "Invalid or expired token"));
  }

  // Verify token and update password
  try {
    await verifyResetTokenAndUpdatePassword(user, token, newPassword);

    // Clear/reset the reset password token after successful update
    user.resetPasswordToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return next(ApiError(500, "Error updating password"));
  }
});

export { forgotPassword, resetPassword };
