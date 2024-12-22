import mongoose from "mongoose";
import Stripe from "stripe";
import { User } from "../user/user.model.js";
import { ApiError } from "../utils/APIError.js";
import Subscription from "./subscription.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_TO_PRICE_MAPPING = {
  starter: "price_1Q1rtkHRK1oXhYsFgF9BtLHk",
  believer: "price_1Q1rvDHRK1oXhYsFBrP8FYTf",
  professional: "price_1Q1s4RHRK1oXhYsFW9Zec455",
  enterprise: "price_1Q1s5PHRK1oXhYsFZuCdEcVO",
};

export const createCheckoutSession = async (req, res) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "unauthorized request");
    const { plan } = req.body;
    if (!plan) throw ApiError(400, "Plan is required");
    const stripePriceId = PLAN_TO_PRICE_MAPPING[plan];

    if (!stripePriceId) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: plan === "believer" ? "payment" : "subscription",
      customer_email: user.email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      billing_address_collection: "required",
      metadata: {
        customer_name: user.fullName,
        userId: user._id.toString(),
        plan: plan,
      },
    });

    res.status(200).json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.log("No stripe-signature header value was provided.");
    return res.status(400).send("Webhook signature verification failed.");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.SANDEEP_STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.created":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "checkout.session.expired":
        console.log("checkout.session.expired");
        break;
      case "payment_intent.succeeded":
      case "payment_intent.created":
      case "charge.succeeded":
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return res.status(500).send(`Webhook Error: ${error.message}`);
  }
};

const handleCheckoutSessionCompleted = async (session) => {
  try {
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );
      await createOrUpdateSubscription(subscription, session);
    } else {
      console.log("Processing one-time payment session");
    }
  } catch (error) {
    console.error("Error in handleCheckoutSessionCompleted:", error);
    throw error;
  }
};

const handleSubscriptionUpdated = async (subscription) => {
  await createOrUpdateSubscription(subscription);
};
const createOrUpdateSubscription = async (
  subscription,
  stripeSession = null,
) => {
  const customerId = subscription.customer;

  let customer;
  try {
    customer = await stripe.customers.retrieve(customerId);
  } catch (error) {
    throw new Error(`Failed to retrieve Stripe customer: ${error.message}`);
  }

  const plan =
    stripeSession?.metadata?.plan || subscription.items.data[0].price.id;
  const userId =
    stripeSession?.metadata?.userId || subscription.metadata?.userId;

  if (!plan) {
    throw new Error(
      "Plan information is missing from subscription or session.",
    );
  }

  const subscriptionData = {
    plan: plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    startDate: new Date(subscription.start_date * 1000),
    endDate: new Date(subscription.current_period_end * 1000),
    customerName: customer?.name || "Unknown",
    customerEmail: customer?.email || "Unknown",
    autoRenew: !subscription.cancel_at_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (userId) {
      const user = await User.findById(userId).session(session);
      if (user) {
        user.plan = plan;
        await user.save({ session });
      } else {
        throw new Error(`User not found with ID: ${userId}`);
      }
    }

    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      subscriptionData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        session,
      },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error(`Transaction failed: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    subscription.status = updatedStripeSubscription.status;
    subscription.cancelAtPeriodEnd =
      updatedStripeSubscription.cancel_at_period_end;
    subscription.autoRenew = false;
    await subscription.save();

    res.json(subscription);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(400).json({ error: error.message });
  }
};

export const upgradePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPlan } = req.body;
    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const newPriceId = PLAN_TO_PRICE_MAPPING[newPlan];
    if (!newPriceId) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.stripeSubscriptionId,
            price: newPriceId,
          },
        ],
      },
    );

    subscription.plan = newPlan;
    subscription.status = updatedStripeSubscription.status;
    subscription.endDate = new Date(
      updatedStripeSubscription.current_period_end * 1000,
    );
    await subscription.save();

    res.json(subscription);
  } catch (error) {
    console.error("Error upgrading plan:", error);
    res.status(400).json({ error: error.message });
  }
};

export const verifySession = async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      throw new ApiError(400, "Session ID is required");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    // Check if the session was successful
    if (session.payment_status === "paid" || session.status === "complete") {
      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        plan: session.metadata.plan,
      });
    } else {
      throw new ApiError(400, "Payment not completed");
    }
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
    });
  }
};
