import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getMostViewedProductsController,
  getProductDetails,
} from "./product_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const productRouter = Router();
// productRouter.use(auth);

productRouter
  .get("/get-all-products", getAllProducts)
  .get("/get-product-details", getProductDetails)
  .get("/get-most-viewed-products", getMostViewedProductsController)
  .post("/create-product", createProduct);

export default productRouter;
