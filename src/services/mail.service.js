import nodemailer from "nodemailer";
import { ApiError } from "../utils/APIError.js";

export const sendEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "OTP for Verification",
      text: `Your OTP for verification is ${otp}. It will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes.`,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(err);
    throw ApiError(500, "Error sending OTP email");
  }
};

export const sendResetPasswordMail = async (email, resetToken) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "Reset Password",
      text: `Click on the link to reset your password: ${process.env.CLIENT_URL}/reset-password/${resetToken}`,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(err);
    throw ApiError(500, "Error sending reset password email");
  }
};
