import { Affiliation } from "../affiliation/affiliation_model.js";
import { accountType } from "../common/common_constants.js";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fetchProductByFilter, fetchProductById } from "./product_service.js";
import { User } from "../user/user.model.js";
import { Collection } from "../models/collection.model.js";

const createProduct = asyncHandler(async (req, res, next) => {
  try {
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

    let imageUrls = [];
    let message = "Product created successfully";

    if (req.files && req.files.length > 0) {
      const imageUrlsLocal = req.files.map((file) => file.path);
      imageUrls = await Promise.all(
        imageUrlsLocal.map(async (image) => {
          const result = await uploadOnCloudinary(image);
          return result.url;
        }),
      );
    } else {
      message += ". No images were uploaded";
    }

    const product = await Product.create({
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

    return res.status(201).json(new ApiResponse(201, product, message));
  } catch (err) {
    next(err);
  }
});

const getAllProducts = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.accountType !== accountType.INFLUENCER) {
      throw ApiError(401, "Unauthorized");
    }

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

    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(403, "user should be an influencer or a brand");
    }
    const productId = req.params.id;
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

const deleteProduct = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      throw ApiError(401, "Unauthorized");
    }

    const product = await Product.findById(id);

    if (!product) {
      throw ApiError(404, "Product not found");
    }
    if (!product.brandId.equals(user._id)) {
      throw ApiError(403, "Forbidden");
    }

    await Product.findByIdAndDelete(id);

    return res.json({
      message: "Product deleted successfully",
      product,
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

const updateProduct = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
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
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError(404, "Product not found");
    }
    if (!product.brandId.equals(user._id)) {
      throw ApiError(403, "Forbidden");
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        title,
        description,
        category,
        stock,
        price,
        discountPercent,
        productType,
        rating,
        isRecommended,
      },
      { new: true },
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedProduct, "Product updated successfully"),
      );
  } catch (error) {
    next(error);
  }
});

const searchProduct = asyncHandler(async (req, res, next) => {
  try {
    const { name, category, tag } = req.query;
    const query = {};

    if (name) {
      query.title = { $regex: new RegExp(name, "i") };
    }

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    const products = await Product.find(query);

    if (!products.length) {
      throw ApiError(404, "No products found matching the criteria");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, products, "Products fetched successfully"));
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
  deleteProduct,
  updateProduct,
  searchProduct,
};
