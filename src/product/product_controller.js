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
    console.log(req.user.accountType);
    if (req.user.accountType !== "brand") {
      throw ApiError(400, "Action restricted for Influencer accounts");
    }
    const userProductCount = await Product.countDocuments({
      brandId: req.user.id,
    });
    if (req.user.plan === "basic" && userProductCount >= 8) {
      throw ApiError(
        403,
        "You are not authorized to create more than 8 products",
      );
    }
    const {
      title,
      description,
      category,
      stock,
      pricing,
      wholesalePricing,
      productType,
      rating,
      isRecommended,
      commissionPercentage,
      physicalDetails,
      downloadableDetails,
      virtualDetails,
      tags,
      
    } = req.body;

    if (!["physical", "virtual", "downloadable"].includes(productType)) {
      throw ApiError(400, "Invalid productType");
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const imageUrlsLocal = req.files.map((file) => file.path);
      imageUrls = await Promise.all(
        imageUrlsLocal.map(async (image) => {
          const result = await uploadOnCloudinary(image);
          return result.url;
        }),
      );
    }

    const productData = {
      title,
      description,
      category,
      stock,
      pricing,
      wholesalePricing,
      productType,
      imageUrls,
      rating,
      isRecommended,
      tags,
      commissionPercentage,
      brandId: req.user.id,
      brand: req.user.name,
    };

    // Conditionally add sub-schema details based on productType
    if (productType === "physical") {
      if (!physicalDetails) {
        throw ApiError(
          400,
          "Physical details are required for physical products",
        );
      }
      const { weight, height, width, length, packageFormat, ean, sku } =
      physicalDetails;

      if (ean) {
        const existingProductByEan = await Product.findOne({
          "physicalDetails.ean": ean,
        });
        if (existingProductByEan) {
          throw ApiError(409, "EAN must be unique");
        }
      }

      if (sku) {
        const existingProductBySku = await Product.findOne({
          "physicalDetails.sku": sku,
        });
        if (existingProductBySku) {
          throw ApiError(409, "SKU must be unique");
        }
      }
      productData.physicalDetails = {
        weight,
        height,
        width,
        length,
        packageFormat,
        ...(ean && { ean }),
        ...(sku && { sku }),
      };


    } else if (productType === "downloadable") {
      if (!downloadableDetails || !downloadableDetails.fileUpload) {
        throw ApiError(
          400,
          "File upload URL is required for downloadable products",
        );
      }
      productData.downloadableDetails = downloadableDetails;
    } else if (productType === "virtual") {
      if (!virtualDetails || !virtualDetails.link) {
        throw ApiError(400, "Link is required for virtual products");
      }
      productData.virtualDetails = virtualDetails;
    }

    const product = await Product.create(productData);

    return res
      .status(201)
      .json(new ApiResponse(201, product, "Product created successfully"));
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
    const id = req.params.id;
    const product = await fetchProductById(id);
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
      pricing,
      wholesalePricing,
      productType,
      rating,
      isRecommended,
      commissionPercentage,
      physicalDetails,
      downloadableDetails,
      virtualDetails,
      tags,
    } = req.body;
    console.log(req.body, "req.body");
    if (req.user.accountType !== "brand") {
      throw ApiError(400, "Action restricted for influencers");
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    // Check if the user is authorized to update this product
    if (!product.brandId.equals(user._id)) {
      throw new ApiError(403, "Forbidden");
    }

    // Construct the update object
    const updateFields = {
      title,
      description,
      category,
      stock,
      pricing,
      wholesalePricing,
      productType,
      rating,
      isRecommended,
      tags,
      commissionPercentage,
    };

    // Conditionally update sub-schema details based on productType
    if (productType === "physical") {
      if (!physicalDetails) {
        throw new ApiError(
          400,
          "Physical details are required for physical products",
        );
      }
      updateFields.physicalDetails = physicalDetails;
    } else if (productType === "downloadable") {
      if (!downloadableDetails || !downloadableDetails.fileUpload) {
        throw new ApiError(
          400,
          "File upload URL is required for downloadable products",
        );
      }
      updateFields.downloadableDetails = downloadableDetails;
    } else if (productType === "virtual") {
      if (!virtualDetails || !virtualDetails.link) {
        throw new ApiError(400, "Link is required for virtual products");
      }
      updateFields.virtualDetails = virtualDetails;
    }

    // Perform the update
    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

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
