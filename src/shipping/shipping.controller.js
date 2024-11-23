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
    const shipping = await Shipping.create({
      brandId: user._id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Shipping created successfully",
      shipping,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    next(error);
  }
});

// Get All Shipping Rules for a User
const getUserShipping = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const shipping = await Shipping.find({ brandId: userId });

    if (!shipping.length) {
      return res.status(404).json({
        success: false,
        message: "No shipping rules found",
      });
    }

    res.status(200).json({
      success: true,
      shipping,
    });
  } catch (error) {
    next(error);
  }
});

// Get Single Shipping Rule
const getShippingById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipping = await Shipping.findOne({
      _id: id,
      brandId: req.user._id,
    });

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipping rule not found",
      });
    }

    res.status(200).json({
      success: true,
      shipping,
    });
  } catch (error) {
    next(error);
  }
});

// Update Shipping Rule
const updateShipping = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipping = await Shipping.findOneAndUpdate(
      { _id: id, brandId: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipping rule not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Shipping updated successfully",
      shipping,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    next(error);
  }
});

// Delete Shipping Rule
const deleteShipping = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipping = await Shipping.findOneAndDelete({
      _id: id,
      brandId: req.user._id,
    });

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipping rule not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Shipping rule deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Update Shipping Active Status
const updateShippingStatus = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const shipping = await Shipping.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );
    if (!shipping) {
      return res.status(404).json({ message: "Shipping not found" });
    }
    res.status(200).json(shipping);
  } catch (error) {
    next(error);
  }
});

export {
  createShipping,
  getUserShipping,
  getShippingById,
  updateShipping,
  deleteShipping,
  updateShippingStatus,
};
