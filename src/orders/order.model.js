import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  quantity: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    items: [itemSchema],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
