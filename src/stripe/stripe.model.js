// userModel.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { accountType, category, theme } from "../common/common_constants.js";

const additionalLinkSchema = new mongoose.Schema({
  thumbnail: { type: String, required: true },
  host: { type: String, required: true },
  url: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const feedSchema = new mongoose.Schema({
  youtubeLinks: [{ title: String, link: String }],
  affiliateLinks: [{ title: String, link: String }],
  musicLinks: [{ title: String, link: String }],
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: Object.values(accountType),
      required: true,
    },
    categories: [
      {
        type: String,
        enum: Object.values(category),
      },
    ],
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    bio: String,
    avatar: String,
    coverImage: String,
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    socials: {
      twitter: String,
      facebook: String,
      instagram: String,
      linkedin: String,
      youtube: String,
      tiktok: String,
    },
    additionalLinks: [additionalLinkSchema],
    theme: {
      type: String,
      default: "musk",
      enum: Object.values(theme),
    },
    feed: feedSchema,
    stripeCustomerId: String,
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

// subscriptionModel.js
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      required: true,
      enum: ["basic", "starter", "pro"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "cancelled"],
      default: "inactive",
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    stripeSubscriptionId: String,
  },
  { timestamps: true },
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

// paymentModel.js
const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["succeeded", "pending", "failed"],
      required: true,
    },
    stripePaymentIntentId: String,
  },
  { timestamps: true },
);

const Payment = mongoose.model("Payment", paymentSchema);

export { User, Subscription, Payment };

// subscriptionController.js
import Stripe from "stripe";
import { User, Subscription, Payment } from "../models/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createSubscription = async (req, res) => {
  try {
    const { userId, plan } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let customer;
    if (!user.stripeCustomerId) {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    } else {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    }

    const priceId = getPriceIdForPlan(plan);
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    const newSubscription = new Subscription({
      userId: user._id,
      plan,
      status: "inactive",
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
    await newSubscription.save();

    res.json({
      subscriptionId: newSubscription._id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionCancelled(event.data.object);
      break;
    // Add more cases as needed
  }

  res.json({ received: true });
};

async function handlePaymentSucceeded(invoice) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription,
  });
  if (subscription) {
    subscription.status = "active";
    subscription.currentPeriodStart = new Date(invoice.period_start * 1000);
    subscription.currentPeriodEnd = new Date(invoice.period_end * 1000);
    await subscription.save();

    await Payment.create({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      stripePaymentIntentId: invoice.payment_intent,
    });
  }
}

async function handleSubscriptionCancelled(subscriptionObject) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: subscriptionObject.id,
  });
  if (subscription) {
    subscription.status = "cancelled";
    await subscription.save();
  }
}

function getPriceIdForPlan(plan) {
  // Replace these with your actual Stripe price IDs
  const priceIds = {
    basic: "price_basic_id",
    starter: "price_starter_id",
    pro: "price_pro_id",
  };
  return priceIds[plan];
}

// routes/subscription.js
import express from "express";
import {
  createSubscription,
  handleWebhook,
} from "../controllers/subscriptionController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/create", authenticateUser, createSubscription);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

export default router;
