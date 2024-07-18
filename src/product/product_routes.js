import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getProductDetails,
} from "./product_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const productRouter = Router();
productRouter.use(auth);

productRouter
  .get("/get-all-products", getAllProducts)
  .get("/get-product-details", getProductDetails)
  .post("/create-product", createProduct);

export default productRouter;
