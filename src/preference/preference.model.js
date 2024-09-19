import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  notification: {
    productPurchase: {
      type: Boolean,
      default: true,
    },
    pageView: {
      type: Boolean,
      default: true,
    },
    paymentConfirmation: {
      type: Boolean,
      default: true,
    },
    specialOffers: {
      type: Boolean,
      default: true,
    },
  },
});

const Preference = mongoose.model("Preference", preferenceSchema);

export default Preference;
