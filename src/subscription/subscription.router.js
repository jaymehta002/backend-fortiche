import { Router } from "express";
import {
  createCheckoutSession,
  handleStripeWebhook,
  cancelSubscription,
  upgradePlan,
  verifySession,
} from "./subscription.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import express from "express";
const subscriptionRouter = Router();

subscriptionRouter.use(express.json());
subscriptionRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

subscriptionRouter.use(auth);

subscriptionRouter.post("/create", createCheckoutSession);
subscriptionRouter.put("/cancel/:id", cancelSubscription);
subscriptionRouter.put("/upgrade/:id", upgradePlan);
subscriptionRouter.post("/verify-session", verifySession);

export default subscriptionRouter;
