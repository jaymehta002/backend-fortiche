import { Router } from "express";
import {
  checkoutInfluencer,
  createGuestCheckout,
  handleGuestSuccess,
  handleSuccessPage,
  getRecentTransactions,
  getTaxes,
  handleCheckout,
  handleStripeCheckout,
  handleTipping,
  handleTippingSuccess,
  //   handleStripeWebhook,
} from "./checkout.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const checkoutRouter = Router();
checkoutRouter.post("/guest", createGuestCheckout);
checkoutRouter.post("/verify/guest", handleGuestSuccess);
checkoutRouter.post("/taxes", getTaxes);
checkoutRouter.post("/test", handleCheckout);
checkoutRouter.post("/verify/test", handleStripeCheckout);
checkoutRouter.post("/tipping", handleTipping);
checkoutRouter.get("/tipping/success", handleTippingSuccess);

checkoutRouter.use(auth);
checkoutRouter.post("/influencer", checkoutInfluencer);
checkoutRouter.post("/verify/influencer", handleSuccessPage);
checkoutRouter.get("/transactions", getRecentTransactions);
export default checkoutRouter;
