// import { Router } from "express";
// import express from "express";
// import {
//   createCheckoutSession,
//   handleStripeWebhook,
//   cancelSubscription,
// } from "./subscription.controller.js";

// const subscriptionRouter = Router();

// subscriptionRouter.post("/create", createCheckoutSession);

// subscriptionRouter.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   handleStripeWebhook,
// );

// subscriptionRouter.put("/cancel/:id", cancelSubscription);

// export default subscriptionRouter;

import { Router } from "express";
import {
  createCheckoutSession,
  handleStripeWebhook,
  cancelSubscription,
  upgradePlan,
} from "./subscription.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const subscriptionRouter = Router();

subscriptionRouter.post("/webhook", handleStripeWebhook);
subscriptionRouter.use(auth);

subscriptionRouter.post("/create", createCheckoutSession);
subscriptionRouter.put("/cancel/:id", cancelSubscription);
subscriptionRouter.put("/upgrade/:id", upgradePlan);

export default subscriptionRouter;
