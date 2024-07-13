import mongoose from "mongoose";

const affiliationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // Reference to the Product model
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    totalSaleQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSaleRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Affiliation = mongoose.model("Affiliation", affiliationSchema);
export { Affiliation };
