import mongoose, { Schema } from "mongoose";

const subscriptions = {
  influencer: {
    basic: "basic",
    pro: "pro",
    premium: "premium",
  },
  brand: {
    starter: "starter",
    business: "business",
    enterprise: "enterprise",
  },
};

const subscriptionPlans = [
  ...Object.values(subscriptions.influencer),
  ...Object.values(subscriptions.brand),
];

const subscriptionSchema = new Schema(
  {
    plan: {
      type: String,
      required: true,
      enum: subscriptionPlans,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "cancelled", "expired"],
      default: "inactive",
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
    },
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],
    autoRenew: {
      type: Boolean,
      default: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    customerAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: String,
    },
    description: String,
  },
  { timestamps: true },
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
