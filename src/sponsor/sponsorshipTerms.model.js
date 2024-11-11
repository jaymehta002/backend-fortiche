import { Schema, model } from "mongoose";

const sponsorshipTermsSchema = new Schema({
  influencerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  duration: {
    type: Number, // Duration in days
    required: true,
  },
  termsAndConditions: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default model("SponsorshipTerms", sponsorshipTermsSchema);
