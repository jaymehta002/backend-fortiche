import { Router } from "express";
import {
  createAffiliationController,
  getAffiliationProductController,
  getProductsAffiliatedByUser,
} from "./affiliation_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const publicAffiliationRouter = Router();
const affiliationRouter = Router();

affiliationRouter.get(
  "/get-affiliation-product/:affiliationId",
  getAffiliationProductController,
);
affiliationRouter.use(auth);

affiliationRouter
  .post("/create-affiliation", createAffiliationController)
  .get("/get-user-affiliated-products", getProductsAffiliatedByUser);

export { publicAffiliationRouter, affiliationRouter };
