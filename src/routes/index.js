import express from "express";
import userRoutes from "./user.routes.js";
import productRoutes from "./product.routes.js";
import authRoutes from "./auth.routes.js";

const router = express.Router();

router
  .use("/users", userRoutes)
  .use("/products", productRoutes)
  .use("/auth", authRoutes);

export default router;
