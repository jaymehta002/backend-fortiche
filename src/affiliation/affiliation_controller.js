import {
  increaseAffiliationClickCount,
  increasePageViewCount,
} from "./affiliation_service.js";
import { fetchProductById } from "../product/product_service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { accountType } from "../common/common_constants.js";
import { Affiliation } from "./affiliation_model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";

const getAffiliationProductController = asyncHandler(async (req, res, next) => {
  try {
    const { affiliationId } = req.params;
    // console.log(affiliationId);
    const productId = await Affiliation.findById(affiliationId);
    // console.log(productId);

    const product = await fetchProductById(productId.productId);
    // console.log(affiliationId);

    await increaseAffiliationClickCount(affiliationId, 1);
    // console.log(affiliationId);

    // Increase page view count for the affiliation
    await increasePageViewCount(affiliationId, 1);

    return res
      .status(200)
      .json(new ApiResponse(200, product, "product fetched successfully"));
  } catch (err) {
    return next(err);
  }
});
const getInfluencerIdController = asyncHandler(async (req, res, next) => {
  const { affiliationId } = req.params;
  const affiliation = await Affiliation.findById(affiliationId);
  const influencerId = affiliation.influencerId;
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { influencerId: influencerId },
        "influencer id fetched successfully",
      ),
    );
});
const createAffiliationController = asyncHandler(async (req, res, next) => {
  try {
    if (req.user.accountType != accountType.INFLUENCER) {
      throw ApiError(403, "account type should be influencer");
    }

    const influencerId = req.user._id;
    const productId = req.body.productId;

    const affiliation = await Affiliation.create({
      productId,
      influencerId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, affiliation, "affiliation created successfully"),
      );
  } catch (err) {
    return next(err);
  }
});

const getProductsAffiliatedByUser = asyncHandler(async (req, res, next) => {
  try {
    // const userId = req.user._id;
    // const affiliations = await Affiliation.find({ influencerId: userId });
    // // console.log(affiliations);
    // const productIds = await affiliations.map((aff) => {
    //   return aff.productId;
    // });
    // const products = await Promise.all(
    //   productIds.map((productId) => fetchProductById(productId)),
    // );
    // return res.json(
    //   new ApiResponse(200, products, "products fetched successfully"),
    // );
    const userId = req.user._id;
    // Fetch affiliations and populate the product details
    const affiliations = await Affiliation.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      influencerId: userId,
    })
      .populate("productId")
      .exec();

    return res.json(
      new ApiResponse(
        200,
        affiliations,
        "Affiliations with products fetched successfully",
      ),
    );
  } catch (err) {
    return next(err);
  }
});

const deleteAffiliationController = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const affiliation = await Affiliation.findOneAndUpdate(
      { _id: id, influencerId: userId },
      { isDeleted: true },
    );
    return res.json(
      new ApiResponse(200, affiliation, "Affiliation deleted successfully"),
    );
  } catch (err) {
    return next(err);
  }
});

export {
  getAffiliationProductController,
  createAffiliationController,
  getProductsAffiliatedByUser,
  deleteAffiliationController,
  getInfluencerIdController,
};
