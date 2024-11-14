import { Router } from "express";
import {
  createCommision,
  getCommisionsByProduct,
  getCommisionsByUser,
  updateCommision,
  deleteCommision,
} from "./commision.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

router.post("/create", createCommision);
router.get("/product/:productId", getCommisionsByProduct);
router.get("/user/:userId?", getCommisionsByUser);
router.patch("/:commisionId", updateCommision);
router.delete("/:commisionId", deleteCommision);

export default router;
