import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    totalSaleRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    pageViews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Analytics = mongoose.model("Analytics", analyticsSchema);
export { Analytics };
