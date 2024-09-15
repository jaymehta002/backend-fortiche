import { Router } from "express";
import {
  checkoutInfluencer,
  handleSuccessPage,
  //   handleStripeWebhook,
} from "./checkout.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const checkoutRouter = Router();
// checkoutRouter.post("/webhook", handleStripeWebhook);
checkoutRouter.use(auth);
checkoutRouter.post("/influencer", checkoutInfluencer);
checkoutRouter.post("/success", handleSuccessPage);

export default checkoutRouter;
