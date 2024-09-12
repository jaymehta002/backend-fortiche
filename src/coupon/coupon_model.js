import mongoose, { Schema } from "mongoose";

const couponSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  applyTo: {
    type: String,
    enum: [
      "SUBTOTAL",
      "DELIVERY",
      "SELECTED_PRODUCTS",
      "BUY_X_GET_Y",
      "PAYMENT_METHOD",
    ],
    required: true,
  },
  discountType: {
    type: String,
    enum: ["PERCENTAGE", "AMOUNT"],
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId, // Fixed the type definition
    ref: "User",
  },
});

// Export the schema and register it with a model
const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
