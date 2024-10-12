import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Coupon from "./coupon_model.js";

const createCoupon = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (user.accountType !== "brand") {
      throw ApiError(400, "You must be an account to create a coupon");
    }
    const { name, usageLimit, applyTo, discountType, discountAmount } =
      req.body;
    if (!name) {
      return next(ApiError("Coupon name is required")); // Added error case for missing name
    }
    if (!usageLimit) {
      return next(ApiError("Usage limit is required")); // Added error case for missing usageLimit
    }
    if (!applyTo) {
      return next(ApiError("Apply to field is required")); // Added error case for missing applyTo
    }
    if (!discountType) {
      return next(ApiError("Discount type is required")); // Added error case for missing discountType
    }
    if (discountAmount === undefined) {
      // Check for undefined to allow 0 as a valid value
      return next(ApiError("Discount amount is required")); // Added error case for missing discountAmount
    }

    const coupon = new Coupon({
      name,
      usageLimit,
      applyTo,
      discountType,
      discountAmount,
      brandId: user._id,
    });

    await coupon.save(); // Save the coupon to the database
    return res
      .status(201)
      .json(new ApiResponse(201, coupon, "Coupon created successfully")); // Use ApiResponse
  } catch (error) {
    next(error);
  }
});

const getAllCoupons = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "Action restricted");

    const coupons = await Coupon.find({ brandId: user._id });
    return res.json(
      new ApiResponse(200, coupons, "Coupons retrieved successfully"),
    ); // Use ApiResponse
  } catch (error) {
    next(error);
  }
});

const deleteCoupon = asyncHandler(async (req, res, next) => {
  try {
    const id = req.params.id; // Extract the coupon ID from params
    const user = req.user;

    const coupon = await Coupon.findOne({ _id: id, brandId: user._id });
    if (!coupon) {
      return next(ApiError(404, "Coupon not found")); // Handle case where coupon does not exist
    }

    await Coupon.deleteOne({ _id: id }); // Delete the coupon
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Coupon deleted successfully")); // Use ApiResponse
  } catch (error) {
    next(error);
  }
});

const updateCoupon = asyncHandler(async (req, res, next) => {
  try {
    const id = req.params.id; // Extract the coupon ID from params
    const user = req.user;

    const coupon = await Coupon.findOne({ _id: id, brandId: user._id });
    if (!coupon) {
      return next(ApiError(404, "Coupon not found")); // Handle case where coupon does not exist
    }

    const { name, usageLimit, applyTo, discountType, discountAmount } =
      req.body;
    if (name) coupon.name = name; // Update name if provided
    if (usageLimit) coupon.usageLimit = usageLimit; // Update usageLimit if provided
    if (applyTo) coupon.applyTo = applyTo; // Update applyTo if provided
    if (discountType) coupon.discountType = discountType; // Update discountType if provided
    if (discountAmount !== undefined) coupon.discountAmount = discountAmount; // Update discountAmount if provided

    await coupon.save(); // Save the updated coupon to the database
    return res
      .status(200)
      .json(new ApiResponse(200, coupon, "Coupon updated successfully")); // Use ApiResponse
  } catch (error) {
    next(error);
  }
});

const applyCoupon = asyncHandler(async (req, res, next) => {
  const { couponCode, id } = req.query;
  const coupon = await Coupon.findOne({ code: couponCode, brandId });
  if (!coupon) {
    return next(ApiError(404, "Coupon not found"));
  }
  res.json(new ApiResponse(200, coupon, "Coupon applied successfully"));
});

export { createCoupon, getAllCoupons, deleteCoupon, updateCoupon, applyCoupon }; // Export the new updateCoupon function
