import { Router } from "express";
import { getAffiliationProduct } from "./affiliation_controller.js";

const publicAffiliationRouter = Router();

publicAffiliationRouter.get("/get-affiliation-product", getAffiliationProduct);

export default publicAffiliationRouter;
