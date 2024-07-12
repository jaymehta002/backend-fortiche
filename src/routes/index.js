import express from "express";
import authRoutes from "./auth.routes.js";
import userRouter from "../user/user_router.js";
import productRouter from "../product/product_routes.js";
const router = express.Router();

router
  .use("/user", userRouter)
  .use("/product", productRouter)
  .use("/auth", authRoutes);

export default router;
