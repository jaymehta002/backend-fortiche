import express from "express";
import authRoutes from "./auth.routes.js";
import userRouter from "../user/user_router.js";
import productRouter from "../product/product_routes.js";
import publicAffiliationRouter from "../affiliation/affiliation_router.js";
const router = express.Router();
const publicRouter = express.Router();

publicRouter.get("/affiliation", publicAffiliationRouter);

router
  .use("/users", userRouter)
  .use("/product", productRouter)
  .use("/auth", authRoutes)
  .use("/public", publicRouter);

export default router;
