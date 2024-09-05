import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  getAllProducts,
  deleteProduct,
  updateProduct,
  getAllBrands,
} from "./brand.controller.js";

const brandRouter = Router();

brandRouter.use(auth);

brandRouter
  .get("/getAllBrands", getAllBrands)
  .get("/getAllProducts", getAllProducts)
  .delete("/deleteProduct/:id", deleteProduct)
  .patch("/updateProduct/:id", updateProduct);

export default brandRouter;
