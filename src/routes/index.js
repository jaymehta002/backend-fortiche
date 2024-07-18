import express from "express";
import authRoutes from "./auth.routes.js";
import { userRouter, publicUserRouter } from "../user/user_router.js";
import productRouter from "../product/product_routes.js";
import {
  affiliationRouter,
  publicAffiliationRouter,
} from "../affiliation/affiliation_router.js";
const router = express.Router();
const publicRouter = express.Router();

publicRouter
  .use("/affiliation", publicAffiliationRouter)
  .use("/user", publicUserRouter);

router
  .use("/user", userRouter)
  .use("/product", productRouter)
  .use("/auth", authRoutes)
  .use("/public", publicRouter)
  .use("/affiliation", affiliationRouter);

export default router;
