import express from "express";
import authRoutes from "./auth.routes.js";
import { userRouter, publicUserRouter } from "../user/user_router.js";
import productRouter from "../product/product_routes.js";
import {
  affiliationRouter,
  publicAffiliationRouter,
} from "../affiliation/affiliation_router.js";
import brandRouter from "../brand/brand_router.js";
import recommendationRouter from "../recommendation/recommendation.router.js";
import feedRouter from "../feed/feed.router.js";
import orderRouter from "../orders/order.route.js";
import paymentRouter from "../payments/payment_router.js";
import couponRouter from "../coupon/coupon.route.js";
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
  .use("/payment", paymentRouter)
  .use("/coupon", couponRouter);

export default router;
