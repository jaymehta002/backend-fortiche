import { Router } from "express";
import {
  checkoutInfluencer,
  createGuestCheckout,
  handleGuestSuccess,
  handleSuccessPage,
  //   handleStripeWebhook,
} from "./checkout.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const checkoutRouter = Router();
checkoutRouter.post("/guest", createGuestCheckout);
checkoutRouter.post("/verify/guest", handleGuestSuccess);
checkoutRouter.use(auth);
checkoutRouter.post("/influencer", checkoutInfluencer);
checkoutRouter.post("/verify/influencer", handleSuccessPage);

export default checkoutRouter;
