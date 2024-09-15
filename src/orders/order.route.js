import Router from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  createOrder,
  getOrder,
  getUserOrders,
  deleteOrder,
} from "./order.controller.js";

const orderRouter = Router();

orderRouter.use(auth);

orderRouter
  .post("/create-order", createOrder)
  .get("/get-order", getUserOrders)
  .get("/get-order/:id", getOrder)
  .delete("/delete-order/:id", deleteOrder);

export default orderRouter;

// TODO
// COUPONS CRUD done
// GUEST USER Checkout
// Feed & link done partial
// Shipping Zone done
// payment gateway
