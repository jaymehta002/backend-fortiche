import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["paid", "pending", "failed"],
      default: "pending",
    },
    shippingStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending",
    },
    shippingAddress: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Influencer",
      required: function () {
        return !this.guestId; // If guestId is not present, influencerId is required
      },
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: function () {
        return !this.influencerId; // If influencerId is not present, guestId is required
      },
    },
    stripeAccountId: {
      type: String,
      required: true
    },
    brandStripeAccountId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", OrderSchema);
export default Order;
