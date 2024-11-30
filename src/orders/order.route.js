import Router from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  createOrder,
  getOrder,
  getUserOrders,
  deleteOrder,
  updateUserOrders,
} from "./order.controller.js";

const orderRouter = Router();

orderRouter.use(auth);

orderRouter
  .post("/create-order", createOrder)
  .get("/get-order", getUserOrders)
  .get("/get-order/:id", getOrder)
  .delete("/delete-order/:id", deleteOrder)
  .put("/update-order", updateUserOrders);

export default orderRouter;

// TODO
// COUPONS CRUD done
// GUEST USER Checkout
// Feed & link done partial
// Shipping Zone done
// payment gateway
