import { Router } from "express";
import {
  createPayment,
  getPaymentById,
  getAllPayments,
} from "./payment_controller.js";

const router = Router();

router.post("/create", createPayment);
router.get("/fetch/:id", getPaymentById);
router.get("/all", getAllPayments); 

export default router;
