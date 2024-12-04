import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  getCouponById, // Add controller for fetching a coupon by ID
  updateCoupon,
  deactivateCoupon, // Add controller for soft-deleting a coupon
  applyCoupon,
} from "./coupon.controller.js";

const router = Router();

// Public route to apply a coupon (usually for customers)
router.post("/apply", applyCoupon);

// Protected routes (admin or brand user)
router.use(auth);

router
  .post("/add", createCoupon)

  .get("/get", getAllCoupons)

  .get("/:id", getCouponById)
  .patch("/update/:id", updateCoupon)
  .delete("/delete/:id", deleteCoupon)
  .patch("/deactivate/:id", deactivateCoupon);

export default router;
