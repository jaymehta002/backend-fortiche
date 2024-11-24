import { Router } from "express";
import {
  createCommision,
  getCommisionsByProduct,
  getCommisionsByUser,
  updateCommision,
  deleteCommision,
  getCommisions,
  removeCommision,
} from "./commision.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();
// Apply auth middleware to all routes
router.use(auth);

router.post("/create", createCommision);
router.get("/brand", getCommisions);
router.get("/product/:productId", getCommisionsByProduct);
router.get("/user/:userId?", getCommisionsByUser);
router.patch("/:commisionId", updateCommision);
router.delete("/:commisionId", deleteCommision);
router.post("/remove", removeCommision);

export default router;
