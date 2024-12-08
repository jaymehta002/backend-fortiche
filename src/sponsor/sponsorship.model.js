import { Schema, model } from "mongoose";

const sponsorshipSchema = new Schema({
  influencerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  brandId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "approved", "rejected", "paid", "completed"],
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number, // Duration in days
    required: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export default model("Sponsorship", sponsorshipSchema);
