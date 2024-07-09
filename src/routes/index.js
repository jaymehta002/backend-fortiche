import express from "express";
// import userRoutes from "./user.routes.js";
import productRoutes from "./product.routes.js";
import authRoutes from "./auth.routes.js";
import userRouter from "../user/user_router.js";

import googleRoutes from "./google.routes.js";
const router = express.Router();

router
  .use("/user", userRouter)
  .use("/product", productRoutes)
  .use("/auth", authRoutes)
  .use("/google", googleRoutes);

export default router;
