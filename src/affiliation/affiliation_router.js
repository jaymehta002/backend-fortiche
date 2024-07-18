import { Router } from "express";
import {
  createAffiliationController,
  getAffiliationProductController,
} from "./affiliation_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const publicAffiliationRouter = Router();
const affiliationRouter = Router();
affiliationRouter.use(auth);

publicAffiliationRouter.get(
  "/get-affiliation-product",
  getAffiliationProductController,
);

affiliationRouter.post("/create-affiliation", createAffiliationController);

export { publicAffiliationRouter, affiliationRouter };
