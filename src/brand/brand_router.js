import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  getAllProducts,
  deleteProduct,
  updateProduct,
} from "./brand.controller.js";

const brandRouter = Router();

brandRouter.use(auth);

brandRouter
  .get("/getAllProducts", getAllProducts)
  .delete("/deleteProduct/:id", deleteProduct)
  .patch("/updateProduct/:id", updateProduct);

export default brandRouter;
