import Router from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { createOrder } from "./order.controller.js";

const orderRouter = Router();

orderRouter.use(auth);

orderRouter.post("/create-order", createOrder);

export default orderRouter;
