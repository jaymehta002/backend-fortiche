import nodemailer from "nodemailer";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";

const OTP_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 10;

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp) => {
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

export const generateAndSendOTP = async (email) => {
  const otp = generateOTP();
  const otpExpiration = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

  const otpToHash = `${otp}.${otpExpiration}`;
  const hashedOTP = await bcrypt.hash(otpToHash, SALT_ROUNDS);

  await sendOTPEmail(email, otp);

  return { hashedOTP, otpExpiration };
};

export const verifyOTP = async (hashedOTP, receivedOTP, otpExpiration) => {
  if (Date.now() > otpExpiration) {
    throw new ApiError(400, "OTP has expired");
  }

  const otpToVerify = `${receivedOTP}.${otpExpiration}`;
  const isValid = await bcrypt.compare(otpToVerify, hashedOTP);

  if (!isValid) {
    throw new ApiError(400, "Invalid OTP");
  }
};
