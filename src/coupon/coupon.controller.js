import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Coupon from "./coupon_model.js";

// Controller to create a new coupon
const createCoupon = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(ApiError(401, "Authentication required"));
  }

  if (user.accountType !== "brand") {
    return next(
      ApiError(403, "You must be a brand account to create a coupon"),
    );
  }

  const {
    name,
    usageLimit,
    applyTo,
    discountType,
    discountAmount,
    expiry,
    cumulative,
    activateCondition,
  } = req.body;

  // Enhanced validation
  if (!name?.trim()) {
    return next(ApiError(400, "Coupon name is required"));
  }

  if (name.length > 100) {
    return next(ApiError(400, "Coupon name cannot exceed 100 characters"));
  }

  if (!Number.isInteger(usageLimit) || usageLimit <= 0) {
    return next(ApiError(400, "Usage limit must be a positive integer"));
  }

  if (
    !Array.isArray(applyTo) ||
    applyTo.length === 0 ||
    !applyTo.every((value) =>
      [
        "SUBTOTAL",
        "DELIVERY",
        "SELECTED_PRODUCTS",
        "BUY_X_GET_Y",
        "PAYMENT_METHOD",
      ].includes(value),
    )
  ) {
    return next(ApiError(400, "Invalid or empty applyTo value(s)"));
  }

  if (!["PERCENTAGE", "AMOUNT"].includes(discountType?.toUpperCase())) {
    return next(
      ApiError(400, "Invalid discount type. Must be PERCENTAGE or AMOUNT"),
    );
  }

  if (typeof discountAmount !== "number" || discountAmount < 0) {
    return next(ApiError(400, "Discount amount must be a non-negative number"));
  }

  // Additional validation for percentage discount
  if (discountType.toUpperCase() === "PERCENTAGE" && discountAmount > 100) {
    return next(ApiError(400, "Percentage discount cannot exceed 100%"));
  }

  // Validate expiry date is required and must be in future
  if (!expiry) {
    return next(ApiError(400, "Expiry date is required"));
  }

  const expiryDate = new Date(expiry);
  if (isNaN(expiryDate.getTime())) {
    return next(ApiError(400, "Invalid expiry date format"));
  }

  if (expiryDate <= new Date()) {
    return next(ApiError(400, "Expiry date must be in the future"));
  }

  // Validate activateCondition if provided
  if (activateCondition && typeof activateCondition !== "object") {
    return next(ApiError(400, "Activate condition must be an object"));
  }

  // Check if coupon name already exists for this brand
  const existingCoupon = await Coupon.findOne({
    name: name.trim(),
    brandId: user._id,
  });

  if (existingCoupon) {
    return next(ApiError(400, "Coupon with this name already exists"));
  }

  const coupon = new Coupon({
    name: name.trim(),
    usageLimit,
    applyTo,
    discount: {
      type: discountType.toUpperCase(),
      amount: discountAmount,
    },
    expiry: expiryDate,
    cumulative: Boolean(cumulative),
    activateCondition: new Map(Object.entries(activateCondition || {})),
    brandId: user._id,
    isActive: true,
    usage: 0,
  });

  try {
    await coupon.save();
    return res
      .status(201)
      .json(new ApiResponse(201, coupon, "Coupon created successfully"));
  } catch (error) {
    return next(ApiError(500, "Error creating coupon: " + error.message));
  }
});

// Controller to get all coupons for the logged-in brand
const getAllCoupons = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (!user) return next(ApiError(404, "User not authenticated"));

  const coupons = await Coupon.find({ brandId: user._id });
  return res.json(
    new ApiResponse(200, coupons, "Coupons retrieved successfully"),
  );
});

// Controller to get a single coupon by ID
const getCouponById = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;

  const coupon = await Coupon.findOne({ _id: id, brandId: user._id });
  if (!coupon) {
    return next(ApiError(404, "Coupon not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, coupon, "Coupon retrieved successfully"));
});

// Controller to update a coupon by ID
const updateCoupon = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const {
    name,
    usageLimit,
    applyTo,
    discountType,
    discountAmount,
    expiry,
    cumulative,
    activateCondition,
    isActive,
  } = req.body;

  const updatedCoupon = await Coupon.findOneAndUpdate(
    { _id: id, brandId: user._id },
    {
      $set: {
        ...(name && { name }),
        ...(usageLimit && { usageLimit }),
        ...(applyTo && { applyTo }),
        ...(discountType && { "discount.type": discountType }),
        ...(discountAmount !== undefined && {
          "discount.amount": discountAmount,
        }),
        ...(expiry && { expiry }),
        ...(cumulative !== undefined && { cumulative }),
        ...(activateCondition !== undefined && {
          activateCondition: activateCondition || {},
        }),
        ...(isActive !== undefined && { isActive }),
      },
    },
    { new: true },
  );

  if (!updatedCoupon) {
    return next(ApiError(404, "Coupon not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCoupon, "Coupon updated successfully"));
});

// Controller to delete a coupon (permanent deletion)
const deleteCoupon = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  const coupon = await Coupon.findOne({ _id: id, brandId: user._id });
  if (!coupon) {
    return next(ApiError(404, "Coupon not found"));
  }

  await Coupon.deleteOne({ _id: id });
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Coupon deleted successfully"));
});

const deactivateCoupon = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  const coupon = await Coupon.findOne({ _id: id, brandId: user._id });
  if (!coupon) {
    return next(ApiError(404, "Coupon not found"));
  }

  coupon.isActive = false; // Set the coupon as inactive (soft delete)
  await coupon.save();

  return res
    .status(200)
    .json(new ApiResponse(200, coupon, "Coupon deactivated successfully"));
});

// Controller to apply a coupon
const applyCoupon = asyncHandler(async (req, res, next) => {
  const { couponCode, brandId } = req.body;

  const coupon = await Coupon.findOne({
    name: couponCode,
    brandId,
    isActive: true,
  });
  if (!coupon) {
    return next(ApiError(404, "Coupon not found or inactive"));
  }

  if (coupon.expiry && new Date() > coupon.expiry) {
    return next(ApiError(400, "Coupon has expired"));
  }

  if (coupon.usage >= coupon.usageLimit) {
    return next(ApiError(400, "Coupon usage limit reached"));
  }

  const conditions = coupon.activateCondition || {};
  if (conditions.minOrderValue && orderValue < conditions.minOrderValue) {
    return next(
      ApiError(
        400,
        `Minimum order value of ${conditions.minOrderValue} is required to apply this coupon`,
      ),
    );
  }

  const sanitizedCoupon = {
    name: coupon.name,
    discount: coupon.discount,
    cumulative: coupon.cumulative,
    applyTo: coupon.applyTo,
    expiry: coupon.expiry,
    isActive: coupon.isActive,
    usageLimit: coupon.usageLimit,
    usage: coupon.usage,
  };
  // Additional logic for validating usage limits, expiry, and activation conditions can be added here
  console.log(sanitizedCoupon);
  return res
    .status(200)
    .json(new ApiResponse(200, sanitizedCoupon, "Coupon applied successfully"));
});

export {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  deactivateCoupon,
  applyCoupon,
};
