import express from "express";
import authRoutes from "./auth.routes.js";
import { userRouter, publicUserRouter } from "../user/user_router.js";
import productRouter from "../product/product_routes.js";
import {
  affiliationRouter,
  publicAffiliationRouter,
} from "../affiliation/affiliation_router.js";
import brandRouter from "../brand/brand_router.js";
import postRouter from "../post/post.router.js";
import feedRouter from "../feed/feed.router.js";
import orderRouter from "../orders/order.route.js";
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
  .use("/post", postRouter)
  .use("/feed", feedRouter)
  .use("/order", orderRouter);

export default router;
