import Stripe from "stripe";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { User } from "./user.model.js";
import { updateUserByUserId } from "../user/user_service.js";
import { sendPaymentConfirmationEmail, sendCustomEmail } from "../mail/mailgun.service.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

const getOrCreateStripeCustomer = async (user) => {
  if (user.stripeCustomerId) {
    return await stripe.customers.retrieve(user.stripeCustomerId);
  }
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user._id.toString() },
  });
  await updateUserByUserId(user._id, { stripeCustomerId: customer.id });
  return customer;
};

const createSubscription = asyncHandler(async (req, res) => {
  const { plan, paymentMethodId } = req.body;
  const user = req.user;

  const planHierarchy =
    user.accountType === "influencer"
      ? Object.values(subscriptions.influencer)
      : Object.values(subscriptions.brand);

  if (!planHierarchy.includes(plan)) {
    throw new ApiError(400, "Invalid subscription plan");
  }

  const customer = await getOrCreateStripeCustomer(user);

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customer.id,
  });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env[`STRIPE_PRICE_${plan.toUpperCase()}`] }],
    expand: ["latest_invoice.payment_intent"],
  });

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const updatedUser = await updateUserByUserId(user._id, {
    subscription: {
      plan,
      startDate,
      endDate,
      status: "active",
      stripeSubscriptionId: subscription.id,
      autoRenew: true,
    },
    plan,
  });

  // Send subscription confirmation email
  await sendCustomEmail(
    user.email,
    "Subscription Confirmation",
    `
      <h2>Welcome to ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan!</h2>
      <div class="highlight-box">
        <h3>Subscription Details</h3>
        <p><strong>Plan:</strong> ${plan}</p>
        <p><strong>Start Date:</strong> ${startDate.toLocaleDateString()}</p>
        <p><strong>Next Billing Date:</strong> ${endDate.toLocaleDateString()}</p>
      </div>
      <p>Thank you for subscribing! You now have access to all ${plan} features.</p>
    `
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: updatedUser,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      },
      "Subscription created successfully",
    ),
  );
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.subscription || user.subscription.status !== "active") {
    throw new ApiError(400, "No active subscription to cancel");
  }

  await stripe.subscriptions.del(user.subscription.stripeSubscriptionId);

  const updatedUser = await updateUserByUserId(user._id, {
    subscription: {
      ...user.subscription,
      status: "cancelled",
      autoRenew: false,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Subscription cancelled successfully"),
    );
});

const upgradeSubscription = asyncHandler(async (req, res) => {
  const { newPlan } = req.body;
  const user = req.user;

  const planHierarchy =
    user.accountType === "influencer"
      ? Object.values(subscriptions.influencer)
      : Object.values(subscriptions.brand);

  if (!planHierarchy.includes(newPlan)) {
    throw new ApiError(400, "Invalid subscription plan");
  }

  if (!user.subscription || user.subscription.status !== "active") {
    throw new ApiError(400, "No active subscription to upgrade");
  }

  if (
    planHierarchy.indexOf(newPlan) <=
    planHierarchy.indexOf(user.subscription.plan)
  ) {
    throw new ApiError(400, "New plan must be higher than current plan");
  }

  const subscription = await stripe.subscriptions.retrieve(
    user.subscription.stripeSubscriptionId,
  );
  await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
    proration_behavior: "create_prorations",
    items: [
      {
        id: subscription.items.data[0].id,
        price: process.env[`STRIPE_PRICE_${newPlan.toUpperCase()}`],
      },
    ],
  });

  const updatedUser = await updateUserByUserId(user._id, {
    subscription: {
      ...user.subscription,
      plan: newPlan,
    },
    plan: newPlan,
  });

  // Send upgrade confirmation email
  await sendCustomEmail(
    user.email,
    "Subscription Upgraded",
    `
      <h2>Your Subscription Has Been Upgraded!</h2>
      <div class="highlight-box">
        <h3>New Plan Details</h3>
        <p><strong>Plan:</strong> ${newPlan}</p>
        <p><strong>Effective:</strong> Immediately</p>
      </div>
      <p>Thank you for upgrading! You now have access to all ${newPlan} features.</p>
      <p>Your next billing cycle will reflect the new plan rate.</p>
    `
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Subscription upgraded successfully"),
    );
});

const toggleAutoRenewal = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.subscription || user.subscription.status !== "active") {
    throw new ApiError(400, "No active subscription found");
  }

  const updatedAutoRenew = !user.subscription.autoRenew;

  await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
    cancel_at_period_end: !updatedAutoRenew,
  });

  const updatedUser = await updateUserByUserId(user._id, {
    subscription: {
      ...user.subscription,
      autoRenew: updatedAutoRenew,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        `Auto-renewal ${updatedAutoRenew ? "enabled" : "disabled"} successfully`,
      ),
    );
});

export {
  createSubscription,
  cancelSubscription,
  upgradeSubscription,
  toggleAutoRenewal,
};
