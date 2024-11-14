import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: "eur"
  },
  type: {
    type: String,
    enum: ["purchase", "refund", "commission", "withdrawal"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending"
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },
  stripeTransferId: String,
  description: String,
  metadata: {
    type: Map,
    of: String
  }
}, { timestamps: true });

export const Transaction = mongoose.model("Transaction", transactionSchema); 