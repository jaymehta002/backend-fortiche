import mongoose, { Schema } from "mongoose";

const shippingSchema = new Schema({
  brandId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  countries: {
    type: [String],
    required: true,
  },
  shippingMethod: {
    type: String,
    required: String,
  },
  shippingCharges: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const Shipping = mongoose.model("Shipping", shippingSchema);

export default Shipping;
