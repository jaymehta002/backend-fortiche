import { accountType } from "../common/common_constants.js";
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { fetchProductById, fetchProducts } from "./product_service.js";
import { fetchUserByUserId } from "../user/user_service.js";

const getAllProducts = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(403, "user should be an influencer");
    }

    const allProducts = await fetchProducts();

    return res
      .status(200)
      .json(
        new ApiResponse(200, allProducts, "all products fetched successfully"),
      );
  } catch (err) {
    return next(err);
  }
});

const getProductDetails = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    if (
      user.accountType !== accountType.INFLUENCER &&
      user.accountType !== accountType.BRAND
    ) {
      throw ApiError(403, "user should be an influencer or a brand");
    }

    const productId = req.body.productId;
    const product = await fetchProductById(productId);
    if (!product) {
      throw ApiError(404, "invalid productId, not found in the database");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, product, "product fetched successfully"));
  } catch (err) {
    return next(err);
  }
});

export { getAllProducts, getProductDetails };
