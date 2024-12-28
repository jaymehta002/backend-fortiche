import mongoose, { Schema } from "mongoose";

// Optimized Coupon Schema
const couponSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true,
    maxlength: 100, // Optional optimization: Limit the name length
  },
  usage: {
    type: Number,
    required: true,
    default: 0, // To track the current number of times used
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  expiry: {
    type: Date, // Expiry date of the coupon
    required: true,
  },
  applyTo: {
    type: [String],
    enum: [
      "SUBTOTAL",
      "DELIVERY",
      // "SELECTED_PRODUCTS",
      // "BUY_X_GET_Y",
      // "PAYMENT_METHOD",
    ],
  },
  discount: {
    type: {
      type: String,
      enum: ["PERCENTAGE", "AMOUNT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true, // Discount value
      min: 0, // Ensure non-negative discount amount
    },
  },
  cumulative: {
    type: Boolean, // Whether the coupon can be used with other discounts
    default: false,
  },
  activateCondition: {
    type: Map, // Dynamic key-value pair for conditions like minimum order, number of items, etc.
    of: Number, // The value could be a number, representing order amount or item count, etc.
    default: {}, // Optional: initialize with empty conditions
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the brand (User)
    ref: "User",
    required: true, // Ensure every coupon is tied to a brand/user
  },
  isActive: {
    type: Boolean,
    default: true, // Allow toggling coupon activity without deleting it
  },
  createdAt: {
    type: Date,
    default: Date.now, // Timestamp when coupon is created
  },
});

// Indexes for performance optimization
couponSchema.index({ name: 1, brandId: 1 }, { unique: true }); // Ensure coupons are unique per brand
couponSchema.index({ expiry: 1 }); // Index for faster queries on expiry dates

// Export the schema and register it with a model
const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
