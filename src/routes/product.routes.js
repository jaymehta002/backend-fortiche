import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";

import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
} from "../controllers/product.controller.js";

const userRouter = Router();

userRouter.route("/products").post(createProduct).get(getProducts);
userRouter.route("/products/:id").get(getProduct).patch(updateProduct);

const router = Router();

router.route("/products").post(auth, createProduct).get(getProducts);
router.route("/products/:id").get(getProduct).patch(updateProduct);

export default router;
