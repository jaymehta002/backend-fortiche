import { Router } from "express";
import {
  checkoutInfluencer,
  createGuestCheckout,
  handleGuestSuccess,
  handleSuccessPage,
  getRecentTransactions,
  //   handleStripeWebhook,
} from "./checkout.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const checkoutRouter = Router();
checkoutRouter.post("/guest", createGuestCheckout);
checkoutRouter.post("/verify/guest", handleGuestSuccess);
checkoutRouter.use(auth);
checkoutRouter.post("/influencer", checkoutInfluencer);
checkoutRouter.post("/verify/influencer", handleSuccessPage);
checkoutRouter.get("/transactions", getRecentTransactions);
export default checkoutRouter;
