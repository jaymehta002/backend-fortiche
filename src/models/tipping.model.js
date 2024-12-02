import mongoose from "mongoose";

const tippingSchema = new mongoose.Schema({
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amounts: [{ type: Number }],
});

export const Tipping = mongoose.model("Tipping", tippingSchema);
