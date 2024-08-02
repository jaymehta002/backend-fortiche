import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/APIError";
import { ApiResponse } from "../utils/APIResponse";
import { User } from "../user/user.model";
import { Product } from "../product/product.model";
import { Affiliation } from "../affiliation/affiliation_model";

const getFeedByUsername = asyncHandler(async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      throw ApiError(404, "User not found");
    }
    const products = await Product.find({
      brandId: user._id,
    });

    const affiliatedProducts = await Affiliation.find({
      influencerId: user._id,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, products, "Products fetched successfully"));
  } catch (error) {
    next(error);
  }
});

export { getFeedByUsername };
