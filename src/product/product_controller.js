import { Affiliation } from "../affiliation/affiliation_model.js";
import { accountType } from "../common/common_constants.js";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fetchProductByFilter, fetchProductById } from "./product_service.js";

const createProduct = asyncHandler(async (req, res, next) => {
  try {
    console.log("check");
    const {
      title,
      description,
      category,
      stock,
      price,
      discountPercent,
      productType,
      rating,
      isRecommended,
    } = req.body;

    const brandId = req.user.id;
    const brand = req.user.fullName;

    const imageUrlsLocal = req.files.map((file) => file.path);

    const imageUrls = await Promise.all(
      imageUrlsLocal.map(async (image) => {
        const result = await uploadOnCloudinary(image);
        return result.url;
      }),
    );

    const products = await Product.create({
      title,
      brand,
      description,
      category,
      stock,
      price,
      discountPercent,
      productType,
      imageUrls,
      rating,
      isRecommended,
      brandId,
    });

    return res.status(201).json(new ApiResponse(201, products));
  } catch (err) {
    next(err);
  }
});

const getAllProducts = asyncHandler(async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [allProducts, totalCount] = await Promise.all([
      fetchProductByFilter(skip, limit),
      Product.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          products: allProducts,
          currentPage: page,
          totalPages: totalPages,
          totalProducts: totalCount,
        },
        "Products fetched successfully",
      ),
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

const getMostViewedProductsController = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    if (
      user.accountType !== accountType.INFLUENCER &&
      user.accountType !== accountType.BRAND
    ) {
      throw ApiError(403, "user should be an influencer or a brand");
    }

    const mostViewedProducts = await Affiliation.aggregate([
      {
        $match: {
          influencerId: user._id,
        },
      },
      {
        $sort: {
          clicks: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $project: {
          productDetails: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          mostViewedProducts,
          "most viewed products fetched successfully",
        ),
      );
  } catch (err) {
    return next(err);
  }
});

const getProductsByUser = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      throw ApiError(401, "Unauthorized");
    }
    const products = await Product.find({ brandId: user._id });
    return res.json({
      message: "All products fetched successfully",
      products,
    });
  } catch (error) {
    next(error);
  }
});

export {
  createProduct,
  getAllProducts,
  getMostViewedProductsController,
  getProductDetails,
  getProductsByUser,
};
