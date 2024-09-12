import Router from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { createOrder } from "./order.controller.js";

const orderRouter = Router();

orderRouter.use(auth);

orderRouter.post("/create-order", createOrder).get("/get-order");

export default orderRouter;

// TODO
// COUPONS CRUD done
// GUEST USER Checkout
// Feed & link
// Shipping Zone
// payment gateway
