import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    registrationData: {
      fullName: { type: String, required: true },
      username: { type: String, required: true },
      password: { type: String, required: true },
    },
  },
  {
    timestamps: true, // Add timestamps for better tracking
  },
);

// Add index for expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model("OTP", otpSchema);
