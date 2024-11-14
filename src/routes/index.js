import express from "express";
import accountRouter from "../accounts/account.router.js";
import { affiliationRouter } from "../affiliation/affiliation_router.js";
import analyticsRouter from "../analytics/analytics.router.js";
import brandRouter from "../brand/brand_router.js";
import checkoutRouter from "../checkout/checkout.router.js";
import couponRouter from "../coupon/coupon.route.js";
import courseRouter from "../course/course.route.js";
import feedRouter from "../feed/feed.router.js";
import messageRouter from "../message/messege.route.js";
import orderRouter from "../orders/order.route.js";
import preferenceRouter from "../preference/preference.route.js";
import productRouter from "../product/product_routes.js";
import recommendationRouter from "../recommendation/recommendation.router.js";
import shippingRouter from "../shipping/shipping.route.js";
import subscriptionRouter from "../subscription/subscription.router.js";
import { publicUserRouter, userRouter } from "../user/user_router.js";
import sponsorRouter from "../sponsor/sponsor.route.js";
import transactionRouter from "../transaction/transaction.routes.js";
import authRoutes from "./auth.routes.js";
const router = express.Router();
const publicRouter = express.Router();

publicRouter.use("/user", publicUserRouter);

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
  .use("/analytics", analyticsRouter)
  .use("/preference", preferenceRouter)
  .use("/course", courseRouter)
  .use("/sponsorship", sponsorRouter)
  .use("/transaction", transactionRouter);

export default router;
