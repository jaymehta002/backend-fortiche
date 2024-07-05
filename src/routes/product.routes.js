import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
} from "../controllers/product.controller.js";

const userRouter = Router();

userRouter.route("/products").post(createProduct).get(getProducts);
userRouter.route("/products/:id").get(getProduct).patch(updateProduct);

export default userRouter;
