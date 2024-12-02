import { Router } from "express";
import {
  createShipping,
  getUserShipping,
  getShippingById,
  updateShipping,
  deleteShipping,
  updateShippingStatus,
} from "./shipping.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const shippingRouter = Router();

shippingRouter.use(auth);

// Routes
shippingRouter.post("/", createShipping);
shippingRouter.get("/", getUserShipping);
shippingRouter.get("/:id", getShippingById);
shippingRouter.put("/:id", updateShipping);
shippingRouter.delete("/:id", deleteShipping);
shippingRouter.patch("/:id/status", updateShippingStatus);

export default shippingRouter;
