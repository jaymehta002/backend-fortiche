import nodemailer from "nodemailer";
import { ApiError } from "../utils/apiError.js";

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
      text: `Your OTP for verification is ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(err);
    throw new ApiError(500, "Error sending OTP email");
  }
};
