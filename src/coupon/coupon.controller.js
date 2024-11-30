import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Coupon from "./coupon_model.js";

// Controller to create a new coupon
const createCoupon = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.accountType !== "brand") {
    return next(
      ApiError(400, "You must be a brand account to create a coupon"),
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

  if (
    !name ||
    !usageLimit ||
    !applyTo ||
    !discountType ||
    discountAmount === undefined
  ) {
    return next(ApiError(400, "All required fields must be provided"));
  }

  const coupon = new Coupon({
    name,
    usageLimit,
    applyTo,
    discount: {
      type: discountType,
      amount: discountAmount,
    },
    expiry,
    cumulative: cumulative !== undefined ? cumulative : false, // Set default to false if not provided
    activateCondition: activateCondition || {}, // Default to an empty object if not provided
    brandId: user._id,
  });

  await coupon.save();
  return res
    .status(201)
    .json(new ApiResponse(201, coupon, "Coupon created successfully"));
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
  } = req.body;

  const coupon = await Coupon.findOne({ _id: id, brandId: user._id });
  if (!coupon) {
    return next(ApiError(404, "Coupon not found"));
  }

  // Update only fields that are provided
  if (name) coupon.name = name;
  if (usageLimit) coupon.usageLimit = usageLimit;
  if (applyTo) coupon.applyTo = applyTo;
  if (discountType) coupon.discount.type = discountType;
  if (discountAmount !== undefined) coupon.discount.amount = discountAmount;
  if (expiry) coupon.expiry = expiry;
  if (cumulative !== undefined) coupon.cumulative = cumulative; // Only update if cumulative is provided
  if (activateCondition !== undefined)
    coupon.activateCondition = activateCondition || {}; // Allow condition to be updated or default to empty object

  await coupon.save();
  return res
    .status(200)
    .json(new ApiResponse(200, coupon, "Coupon updated successfully"));
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
        `Minimum order value of ${conditions.minOrderValue} is required to apply this coupon`
      )
    );
  }

  const sanitizedCoupon = {
    name: coupon.name,
    discount: coupon.discount,
    cumulative: coupon.cumulative,
    applyTo: coupon.applyTo,
    expiry: coupon.expiry,
    isActive:coupon.isActive,
    usageLimit:coupon.usageLimit,
    usage:coupon.usage
  };
  // Additional logic for validating usage limits, expiry, and activation conditions can be added here
 console.log(sanitizedCoupon)
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
