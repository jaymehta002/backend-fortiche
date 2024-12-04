import Stripe from "stripe";
import Subscription from "./subscription.model.js";
import { ApiError } from "../utils/APIError.js";
import mongoose from "mongoose";
import { User } from "../user/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_TO_PRICE_MAPPING = {
  starter: "price_1Q1rtkHRK1oXhYsFgF9BtLHk",
  believer: "price_1Q1rvDHRK1oXhYsFBrP8FYTf",
  basic: "price_1Q1s1sHRK1oXhYsFwtuv5Q86",
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
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
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
  // console.log("Received webhook request");
  // console.log("Headers:", req.headers);
  // console.log("Body:", req.body);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.SUBSCRIPTION_STRIPE_WEBHOOK_SECRET,
    );
    // console.log(event);
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
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "checkout.session.expired":
        console.log("checkout.session.expired");
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true }).send();
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
};

const handleCheckoutSessionCompleted = async (session) => {
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );
  // console.log("subscription", subscription);
  await createOrUpdateSubscription(subscription, session);
};

const handleSubscriptionUpdated = async (subscription) => {
  await createOrUpdateSubscription(subscription);
};

const createOrUpdateSubscription = async (subscription, session = null) => {
  // console.log("session-----------------------\n", session);
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = session.metadata.userId;
  const subscriptionData = {
    plan: session ? session.metadata.plan : subscription.items.data[0].price.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    startDate: new Date(subscription.start_date * 1000),
    endDate: new Date(subscription.current_period_end * 1000),
    customerName: customer.name,
    customerEmail: customer.email,
    // userId: mongoose.Types.ObjectId(session.metadata.customer_id),
    // customerAddress: customer.address,
    autoRenew: !subscription.cancel_at_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  const user = await User.findById(userId);
  user.plan = session.metadata.plan;
  await user.save();
  // console.log("user" , user);

  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    subscriptionData,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
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
