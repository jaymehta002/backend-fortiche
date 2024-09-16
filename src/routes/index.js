import express from "express";
import {
  affiliationRouter,
  publicAffiliationRouter,
} from "../affiliation/affiliation_router.js";
import brandRouter from "../brand/brand_router.js";
import couponRouter from "../coupon/coupon.route.js";
import feedRouter from "../feed/feed.router.js";
import orderRouter from "../orders/order.route.js";
import productRouter from "../product/product_routes.js";
import recommendationRouter from "../recommendation/recommendation.router.js";
import shippingRouter from "../shipping/shipping.controller.js";
import subscriptionRouter from "../subscription/subscription.router.js";
import { publicUserRouter, userRouter } from "../user/user_router.js";
import authRoutes from "./auth.routes.js";
import checkoutRouter from "../checkout/checkout.router.js";
import messageRouter from "../message/messege.route.js";
import accountRouter from "../accounts/account.router.js";
import analyticsRouter from "../analytics/analytics.router.js";
const router = express.Router();
const publicRouter = express.Router();

publicRouter
  .use("/affiliation", publicAffiliationRouter)
  .use("/user", publicUserRouter);

router
  .use("/users", userRouter)
  .use("/product", productRouter)
  .use("/auth", authRoutes)
  .use("/public", publicRouter)
  .use("/affiliation", affiliationRouter)
  .use("/brand", brandRouter)
  .use("/recommendation", recommendationRouter)
  .use("/feed", feedRouter)
  .use("/order", orderRouter)
  .use("/coupon", couponRouter)
  .use("/shipping", shippingRouter)
  .use("/subscription", subscriptionRouter)
  .use("/checkout", checkoutRouter)
  .use("/message", messageRouter)
  .use("/connect", accountRouter)
  .use("/analytics", analyticsRouter);

export default router;
