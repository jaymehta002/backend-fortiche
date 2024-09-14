// subscription.controller.js
import Stripe from "stripe";
import Subscription from "./subscription.model.js";
import { ApiError } from "../utils/APIError.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_TO_PRICE_MAPPING = {
  basic: "price_1PyusdSFuZF2UukWKaRrFToS",
  pro: "price_2ProPlanId",
  premium: "price_3PremiumPlanId",
  starter: "price_4StarterPlanId",
  business: "price_5BusinessPlanId",
  enterprise: "price_6EnterprisePlanId",
};

export const createCheckoutSession = async (req, res) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "unauthorized request");
    const { plan } = req.body;
    const stripePriceId = PLAN_TO_PRICE_MAPPING[plan];

    if (!stripePriceId) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: user.email,
      // customer_email: customerEmail,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      billing_address_collection: "required",
      metadata: {
        customer_name: user.fullName,
        // customer_address: JSON.stringify(customerAddress),
        // description: description,
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
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
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
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
};

const handleCheckoutSessionCompleted = async (session) => {
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );
  await createOrUpdateSubscription(subscription, session);
};

const handleSubscriptionUpdated = async (subscription) => {
  await createOrUpdateSubscription(subscription);
};

const createOrUpdateSubscription = async (subscription, session = null) => {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const subscriptionData = {
    plan: session ? session.metadata.plan : subscription.items.data[0].price.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    startDate: new Date(subscription.start_date * 1000),
    endDate: new Date(subscription.current_period_end * 1000),
    customerName: customer.name,
    customerEmail: customer.email,
    // customerAddress: customer.address,
    autoRenew: !subscription.cancel_at_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  if (session && session.metadata.description) {
    subscriptionData.description = session.metadata.description;
  }

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
