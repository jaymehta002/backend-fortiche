import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
} from "./coupon.controller.js";

const router = Router();

router.use(auth);

router
  .post("/add", createCoupon)
  .get("/get", getAllCoupons)
  .delete("/delete/:id", deleteCoupon)
  .patch("/update/:id", updateCoupon);
export default router;
