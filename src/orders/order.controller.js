import { Affiliation } from "../affiliation/affiliation_model.js";
import { User } from "../user/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Order from "./order.model.js";

const createOrder = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const { items, influencerId } = req.body;
    if (!items) throw ApiError(400, "Invalid data being passed");

    const check = await Affiliation.find({
      productId: items.map((item) => item.productId),
      influencerId: influencerId,
    });
    if (!check || check.length !== items.length) {
      throw new ApiError(
        401,
        "No affiliation found between influencer and product",
      );
    }

    const data = await Order.create({
      items,
      userId: user._id,
      influencerId,
    });

    if (!data) throw ApiError(500, "Order creation failed");

    return res
      .status(201) 
      .json(new ApiResponse(201, data, "Order Created successfully"));
  } catch (error) {
    next(error);
  }
});

export { createOrder };
