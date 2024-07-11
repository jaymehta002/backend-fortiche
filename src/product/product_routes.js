import { Router } from "express";
import { getAllProducts, getProductDetails } from "./product_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const productRouter = Router();
productRouter.use(auth);

productRouter.get("/get-all-products", getAllProducts);
productRouter.get("/get-product-details", getProductDetails);

export default productRouter;
