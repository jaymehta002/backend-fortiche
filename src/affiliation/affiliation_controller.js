import { fetchAffiliationById } from "./affiliation_service.js";
import { fetchProductById } from "../product/product_service.js";
import { increaseAffiliationClickCount } from "./affiliation_manager.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getAffiliationProduct = asyncHandler(async (req, res, next) => {
  try {
    const affiliationId = req.body.affiliationId;

    await increaseAffiliationClickCount(affiliationId, 1);

    const affiliation = await fetchAffiliationById(affiliationId);

    const productId = affiliation.productId;
    const product = await fetchProductById(productId);
    if (!product) {
      throw ApiError(404, "invalid productId: " + productId);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, product, "product fetched successfully"));
  } catch (err) {
    return next(err);
  }
});

export { getAffiliationProduct };
