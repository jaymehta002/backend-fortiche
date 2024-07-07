import { ApiError } from "../utils/APIError.js";
import bcrypt from "bcrypt";
import { sendEmail } from "./mail.service.js";

const OTP_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 10;

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const generateAndSendOTP = async (email) => {
  const otp = generateOTP();
  const otpExpiration = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

  const otpToHash = `${otp}.${otpExpiration}`;
  const hashedOTP = await bcrypt.hash(otpToHash, SALT_ROUNDS);

  await sendEmail(email, otp);

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
