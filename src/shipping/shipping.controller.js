import { auth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Shipping from "./shipping.model.js";
import { Router } from "express";

const shippingRouter = Router();
shippingRouter.use(auth);

// Create Shipping
const createShipping = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const { countries, shippingMethod, shippingCharges } = req.body;
    const shipping = new Shipping({
      brandId: user._id,
      countries,
      shippingMethod,
      shippingCharges,
    });
    await shipping.save();
    res.status(201).json(shipping);
  } catch (error) {
    next(error);
  }
});

const getUserShipping = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const shipping = await Shipping.find({ brandId: userId });
    res.status(200).json(shipping);
  } catch (error) {
    next(error);
  }
});

// Routes
shippingRouter.post("/create", createShipping);
shippingRouter.get("/fetch", getUserShipping);

export default shippingRouter;
