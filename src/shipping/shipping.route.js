import { Router } from "express";
import {
  createShipping,
  getUserShipping,
  updateShippingStatus,
} from "./shipping.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const shippingRouter = Router();

shippingRouter.use(auth);

// Routes
shippingRouter.post("/create", createShipping);
shippingRouter.get("/fetch", getUserShipping);
shippingRouter.patch("/update-status/:id", updateShippingStatus);

export default shippingRouter;
