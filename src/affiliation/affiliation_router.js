import { Router } from "express";
import {
  createAffiliationController,
  getAffiliationProductController,
  getProductsAffiliatedByUser,
} from "./affiliation_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const publicAffiliationRouter = Router();
const affiliationRouter = Router();
affiliationRouter.use(auth);

publicAffiliationRouter.get(
  "/get-affiliation-product",
  getAffiliationProductController,
);

affiliationRouter
  .post("/create-affiliation", createAffiliationController)
  .get("/get-user-affiliated-products", getProductsAffiliatedByUser);

export { publicAffiliationRouter, affiliationRouter };
