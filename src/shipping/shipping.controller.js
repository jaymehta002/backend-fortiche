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

// Update Shipping Active Status
const updateShippingStatus = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params; // Get shipping ID from request parameters
    const { isActive } = req.body; // Get new status from request body
    const shipping = await Shipping.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!shipping) {
      return res.status(404).json({ message: "Shipping not found" });
    }
    res.status(200).json(shipping);
  } catch (error) {
    next(error);
  }
});

// Routes
shippingRouter.post("/create", createShipping);
shippingRouter.get("/fetch", getUserShipping);
shippingRouter.patch("/update-status/:id", updateShippingStatus); // New route for updating status

export default shippingRouter;
