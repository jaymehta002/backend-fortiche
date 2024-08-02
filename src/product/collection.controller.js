import { Collection } from "../models/collection.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { accountType } from "../common/common_constants.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { Product } from "../product/product.model.js";

const createCollection = asyncHandler(async (req, res, next) => {
  try {
    const { title, productIds } = req.body;
    const user = req.user;
    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(401, "Unauthorized");
    }

    const collection = await Collection.create({
      title,
      productIds,
      userId: user._id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, collection, "Collection created successfully"),
      );
  } catch (error) {
    next(error);
  }
});

const getCollections = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(401, "Unauthorized");
    }

    const collections = await Collection.find({ userId: user._id });
    const allProductIds = collections.flatMap((item) => item.productIds);
    const products = await Product.find({ _id: { $in: allProductIds } });

    const payload = collections.map((collection) => ({
      title: collection.title,
      products: products.filter((product) =>
        collection.productIds.includes(product._id),
      ),
      id: collection._id,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, payload, "Collections fetched successfully"));
  } catch (error) {
    next(error);
  }
});

const getCollectionbyId = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(401, "Unauthorized");
    }
    const collection = await Collection.findById(id);
    const productIds = collection.productIds;
    const products = await Product.find({ _id: { $in: productIds } });
    const payload = {
      title: collection.title,
      products: products,
    };
    return res
      .status(200)
      .json(new ApiResponse(200, payload, "Collection fetched successfully"));
  } catch (error) {
    next(error);
  }
});

const updateCollection = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, productIds } = req.body;
    const user = req.user;
    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(401, "Unauthorized");
    }

    const collection = await Collection.findByIdAndUpdate(id, {
      title,
      productIds,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, collection, "Collection updated successfully"),
      );
  } catch (error) {
    next(error);
  }
});

const deleteCollection = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(401, "Unauthorized");
    }
    await Collection.findByIdAndDelete(id);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Collection deleted successfully"));
  } catch (error) {
    next(error);
  }
});

export {
  createCollection,
  getCollections,
  getCollectionbyId,
  updateCollection,
  deleteCollection,
};
